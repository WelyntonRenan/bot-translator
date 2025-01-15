// filepath: src/bot.js
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
ffmpeg.setFfmpegPath(ffmpegInstaller.path);
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const db = require('./database');
require('dotenv').config();

const API_ID = process.env.API_ID;
const API_HASH = process.env.API_HASH;
const BOT_TOKEN = process.env.BOT_TOKEN;
const ELEVEN_LABS_API_KEY = process.env.ELEVEN_LABS_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GROUP_MASTER_ID = process.env.GROUP_MASTER_ID;

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

const convertAudioToWav = (inputPath, outputPath) => {
    return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .toFormat('wav')
            .on('end', () => resolve(outputPath))
            .on('error', (err) => reject(err))
            .save(outputPath);
    });
};

const transcribeAudio = async (audioPath) => {
    try {
        const formData = new FormData();
        formData.append('file', fs.createReadStream(audioPath));
        formData.append('model', 'whisper-1');
        formData.append('language', 'pt');

        const response = await axios.post('https://api.openai.com/v1/audio/transcriptions', formData, {
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                ...formData.getHeaders()
            }
        });
        return response.data.text;
    } catch (error) {
        console.error('Error transcribing audio:', error);
        throw error;
    }
};

const translateTextChat = async (text, targetLanguage) => {
    console.log(text, targetLanguage)
    try {
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: 'gpt-3.5-turbo',
            messages: [
                { role: 'system', content: 'Você é um assistente útil, use extamente a linguangem desejada para tradução e me dê apenas o resultado' },
                { role: 'user', content: `Traduza este texto para ${targetLanguage}: ${text}` }
            ],
            temperature: 0.3
        }, {
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            }
        });
        return response.data.choices[0].message.content.trim();
    } catch (error) {
        console.error('Error translating text:', error);
        throw error;
    }
};

const generateAudio = async (text, voiceId) => {
    try {
        const response = await axios.post(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
            text: text,
            voice_settings: {
                stability: 0.5,
                similarity_boost: 0.8
            }
        }, {
            headers: {
                'xi-api-key': ELEVEN_LABS_API_KEY,
                'Content-Type': 'application/json'
            },
            responseType: 'arraybuffer'
        });
        return response.data;
    } catch (error) {
        console.error('Error generating audio:', error);
        throw error;
    }
};

const replaceMasterGroupLinks = async (text) => {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM master_group WHERE id = ?', [GROUP_MASTER_ID], (err, masterGroup) => {
            if (err) {
                console.error('Error fetching master group from database:', err);
                return reject(err);
            }

            if (masterGroup) {
                text = text.replace(masterGroup.tutorial_link, 'TUTORIAL_LINK');
                text = text.replace(masterGroup.account_creation_link, 'ACCOUNT_CREATION_LINK');
                text = text.replace(masterGroup.support_user, 'SUPPORT_USER');
            }

            resolve(text);
        });
    });
};

const replaceChildChannelLinks = async (text, channelId) => {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM child_channels WHERE id = ?', [channelId], (err, childChannel) => {
            if (err) {
                console.error('Error fetching child channel from database:', err);
                return reject(err);
            }

            if (childChannel) {
                text = text.replace('TUTORIAL_LINK', childChannel.tutorial_link);
                text = text.replace('ACCOUNT_CREATION_LINK', childChannel.account_creation_link);
                text = text.replace('SUPPORT_USER', childChannel.support_user);
            }

            resolve(text);
        });
    });
};

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;

    if (chatId.toString() === GROUP_MASTER_ID) {
        if (msg.voice) {
            try {
                const filePath = await bot.downloadFile(msg.voice.file_id, './');
                const convertedAudioPath = path.join(__dirname, 'audio.wav');
                await convertAudioToWav(filePath, convertedAudioPath);

                const transcribedText = await transcribeAudio(convertedAudioPath);
                console.log('Transcribed text:', transcribedText);

                db.all('SELECT * FROM child_channels', async (err, rows) => {
                    if (err) {
                        console.error('Error fetching channels from database:', err);
                        return;
                    }

                    for (const row of rows) {
                        const channelId = row.id;
                        const config = {
                            language: row.language,
                            voice_id: row.voice_id,
                            tutorial_link: row.tutorial_link,
                            account_creation_link: row.account_creation_link,
                            support_user: row.support_user
                        };

                        console.log(`[INFO] Processando para o canal ${channelId}...`);

                        try {
                            let translatedText = await translateTextChat(transcribedText, config.language);
                            translatedText = await replaceMasterGroupLinks(translatedText);
                            translatedText = await replaceChildChannelLinks(translatedText, channelId);
                            console.log(`Translated text (${config.language}):`, translatedText);

                            const translatedAudio = await generateAudio(translatedText, config.voice_id);
                            const translatedAudioPath = path.join(__dirname, `translated_audio_${channelId}.mp3`);
                            fs.writeFileSync(translatedAudioPath, translatedAudio);

                            await bot.sendVoice(channelId, translatedAudioPath);
                            fs.unlinkSync(translatedAudioPath);

                            console.log(`[INFO] Áudio enviado para o canal ${channelId}`);
                        } catch (error) {
                            console.error(`Error processing channel ${channelId}:`, error);
                        }
                    }

                    fs.unlinkSync(filePath);
                    fs.unlinkSync(convertedAudioPath);
                });
            } catch (error) {
                console.error('Error handling voice message:', error);
            }
        } else if (msg.text) {
            try {
                const originalText = msg.text;
                console.log('Original text:', originalText);

                const tutorialLinkMatch = originalText.match(/tutorial_link\s*=\s*(\S+)/);
                const accountCreationLinkMatch = originalText.match(/account_creation_link\s*=\s*(\S+)/);
                const supportUserMatch = originalText.match(/support_user\s*=\s*(\S+)/);

                if (tutorialLinkMatch || accountCreationLinkMatch || supportUserMatch) {
                    const tutorialLink = tutorialLinkMatch ? tutorialLinkMatch[1] : null;
                    const accountCreationLink = accountCreationLinkMatch ? accountCreationLinkMatch[1] : null;
                    const supportUser = supportUserMatch ? supportUserMatch[1] : null;

                    db.run(
                        'UPDATE master_group SET tutorial_link = ?, account_creation_link = ?, support_user = ? WHERE id = ?',
                        [tutorialLink, accountCreationLink, supportUser, GROUP_MASTER_ID],
                        (err) => {
                            if (err) {
                                console.error('Error updating master group:', err);
                                return;
                            }
                            console.log('Master group updated successfully');
                        }
                    );
                }

                db.all('SELECT * FROM child_channels', async (err, rows) => {
                    if (err) {
                        console.error('Error fetching channels from database:', err);
                        return;
                    }

                    for (const row of rows) {
                        const channelId = row.id;
                        const config = {
                            language: row.language,
                            voice_id: row.voice_id,
                            tutorial_link: row.tutorial_link,
                            account_creation_link: row.account_creation_link,
                            support_user: row.support_user
                        };

                        try {
                            let translatedText = await translateTextChat(originalText, config.language);
                            translatedText = await replaceMasterGroupLinks(translatedText);
                            translatedText = await replaceChildChannelLinks(translatedText, channelId);
                            await bot.sendMessage(channelId, translatedText);
                        } catch (error) {
                            console.error(`Error processing channel ${channelId}:`, error);
                        }
                    }
                });
            } catch (error) {
                console.error('Error handling text message:', error);
            }
        } else if (msg.sticker) {
            try {
                db.all('SELECT * FROM child_channels', async (err, rows) => {
                    if (err) {
                        console.error('Error fetching channels from database:', err);
                        return;
                    }

                    for (const row of rows) {
                        const channelId = row.id;
                        try {
                            await bot.sendSticker(channelId, msg.sticker.file_id);
                        } catch (error) {
                            console.error(`Error processing channel ${channelId}:`, error);
                        }
                    }
                });
            } catch (error) {
                console.error('Error handling sticker message:', error);
            }
        }
    }
});

console.log('[INFO] Bot iniciado! Aguardando mensagens...');
