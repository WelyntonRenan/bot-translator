console.log('JavaScript carregado!');

document.addEventListener('DOMContentLoaded', async () => {
    const voiceSelect = document.getElementById('voice_id');
    const masterVoiceSelect = document.getElementById('master_voice_id');

    try {
        const response = await fetch('/voices');
        const voices = await response.json();

        voices.forEach(voice => {
            const option = document.createElement('option');
            option.value = voice.voice_id;
            option.textContent = voice.name;
            voiceSelect.appendChild(option);

            const masterOption = option.cloneNode(true);
            masterVoiceSelect.appendChild(masterOption);
        });
    } catch (error) {
        console.error('Error fetching voices:', error);
    }
});

document.getElementById('addEditChannelForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const isEditing = document.getElementById('isEditing').value === 'true';
    const channelId = document.getElementById('channelId').value;
    const language = document.getElementById('language').value;
    const voice_id = document.getElementById('voice_id').value;
    const tutorial_link = document.getElementById('tutorial_link').value;
    const account_creation_link = document.getElementById('account_creation_link').value;
    const support_user = document.getElementById('support_user').value;

    const method = isEditing ? 'PUT' : 'POST';
    const url = isEditing ? `/channels/${channelId}` : '/channels';

    console.log(`Submitting form with method: ${method}, url: ${url}`);
    console.log({ channelId, language, voice_id, tutorial_link, account_creation_link, support_user });

    const response = await fetch(url, {
        method: method,
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ channelId, language, voice_id, tutorial_link, account_creation_link, support_user })
    });

    const result = await response.json();
    console.log('Response from server:', result);
    if (result.success) {
        location.reload();
    } else {
        alert('Erro ao salvar canal');
    }
});

document.getElementById('editMasterGroupForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const language = document.getElementById('master_language').value;
    const voice_id = document.getElementById('master_voice_id').value;
    const tutorial_link = document.getElementById('master_tutorial_link').value;
    const account_creation_link = document.getElementById('master_account_creation_link').value;
    const support_user = document.getElementById('master_support_user').value;

    console.log('Submitting master group form');
    console.log({ language, voice_id, tutorial_link, account_creation_link, support_user });

    const response = await fetch('/master-group', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ language, voice_id, tutorial_link, account_creation_link, support_user })
    });

    const result = await response.json();
    console.log('Response from server:', result);
    if (result.success) {
        location.reload();
    } else {
        alert('Erro ao editar grupo mestre');
    }
});

window.editChannel = function(channelId, language, voice_id, tutorial_link, account_creation_link, support_user) {
    document.getElementById('isEditing').value = 'true';
    document.getElementById('channelId').value = channelId;
    document.getElementById('language').value = language;
    document.getElementById('voice_id').value = voice_id;
    document.getElementById('tutorial_link').value = tutorial_link;
    document.getElementById('account_creation_link').value = account_creation_link;
    document.getElementById('support_user').value = support_user;
};

window.removeChannel = async function(channelId) {
    console.log(`Removing channel with ID: ${channelId}`);
    const response = await fetch(`/channels/${channelId}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json'
        }
    });

    const result = await response.json();
    console.log('Response from server:', result);
    if (result.success) {
        document.getElementById(`channel-${channelId}`).remove();
    } else {
        alert('Erro ao remover canal');
    }
};

window.fetchBotChannels = async function() {
    const response = await fetch('/fetch-bot-channels');
    const result = await response.json();
    if (result.success) {
        console.log('Canais do bot:', result.channels);
        // Atualize a interface do usuário com os canais do bot
        const channelsList = document.getElementById('channels').querySelector('ul');
        channelsList.innerHTML = '';
        for (const [channelId, config] of Object.entries(result.channels)) {
            const listItem = document.createElement('li');
            listItem.id = `channel-${channelId}`;
            listItem.innerHTML = `
                Canal: ${config.name} (ID: ${channelId}) - Idioma: ${config.language} - Voice ID: ${config.voice_id}
                <button onclick="editChannel('${channelId}', '${config.language}', '${config.voice_id}', '${config.tutorial_link}', '${config.account_creation_link}', '${config.support_user}')">Editar</button>
                <button onclick="removeChannel('${channelId}')">Remover</button>
            `;
            channelsList.appendChild(listItem);
        }
    } else {
        alert('Erro ao buscar canais do bot');
    }
};