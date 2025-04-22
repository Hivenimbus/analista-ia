document.addEventListener('DOMContentLoaded', function() {
    // Recuperar o ID do agente da URL
    const urlParams = new URLSearchParams(window.location.search);
    const agentId = urlParams.get('id');
    
    if (!agentId) {
        console.error('ID do agente não encontrado na URL');
        window.location.href = 'index.html';
        return;
    }
    
    // Elementos da página
    const agentNameEl = document.getElementById('agentName');
    const agentSpecialtyEl = document.getElementById('agentSpecialty');
    const satisfactionRateEl = document.getElementById('satisfactionRate');
    const conversationsCountEl = document.getElementById('conversationsCount');
    const averageTimeEl = document.getElementById('averageTime');
    const statusFilterEl = document.getElementById('statusFilter');
    const conversationsListEl = document.querySelector('.conversations-list');
    
    // Elementos do modal
    const modal = document.getElementById('conversationModal');
    const closeModalBtn = document.getElementById('closeModal');
    const toggleAnalyticsBtn = document.getElementById('toggleAnalytics');
    const modalTitle = document.getElementById('modal-title');
    const modalDate = document.getElementById('modal-date');
    const modalStatus = document.getElementById('modal-status');
    const messagesContainer = document.getElementById('messages-container');
    const deslizesEl = document.getElementById('conversation-deslizes');
    const sugestoesEl = document.getElementById('conversation-sugestoes');
    const melhoriasEl = document.getElementById('conversation-melhorias');
    const satisfeitoEl = document.getElementById('conversation-satisfeito');
    
    // Estado do painel de análise
    let analyticsVisible = true;
    
    // Dados das conversas armazenados globalmente
    let conversations = [];
    
    // Carregar dados do agente
    loadAgentDetails(agentId);
    
    // Carregar histórico de conversas
    loadConversations(agentId);
    
    // Filtro de status
    statusFilterEl.addEventListener('change', function() {
        filterConversations(statusFilterEl.value);
    });
    
    // Fechar modal
    closeModalBtn.addEventListener('click', closeModal);
    
    // Toggle do painel de análise
    toggleAnalyticsBtn.addEventListener('click', function() {
        toggleAnalytics();
    });
    
    // Fechar modal ao clicar fora
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            closeModal();
        }
    });
    
    // Fechar modal com tecla ESC
    window.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            closeModal();
        }
    });
    
    // Funções
    function loadAgentDetails(agentId) {
        try {
            // Carregar dados do localStorage
            const agentsData = JSON.parse(localStorage.getItem('agentsData') || '[]');
            
            if (!agentsData.length) {
                throw new Error('Nenhum dado encontrado');
            }
            
            // Filtrar conversas deste agente
            const agentConversations = agentsData.filter(conv => conv.instancia === agentId);
            
            if (!agentConversations.length) {
                throw new Error('Nenhuma conversa encontrada para este agente');
            }
            
            // Calcular métricas do agente
            const totalConversations = agentConversations.length;
            const successCount = agentConversations.filter(conv => 
                conv.relatorio[0]?.json?.output?.sucesso === true
            ).length;
            
            const satisfactionRate = Math.round((successCount / totalConversations) * 100);
            
            const totalTime = agentConversations.reduce((sum, conv) => sum + conv.tempo, 0);
            const avgTime = (totalTime / totalConversations).toFixed(1);
            
            // Atualizar a interface com os dados do agente
            agentNameEl.textContent = agentId;
            agentSpecialtyEl.textContent = 'Especialidade: Atendimento';
            satisfactionRateEl.textContent = `${satisfactionRate}%`;
            conversationsCountEl.textContent = totalConversations;
            averageTimeEl.textContent = `${avgTime}m`;
            
        } catch (error) {
            console.error('Erro ao carregar detalhes do agente:', error);
            agentNameEl.textContent = `Agente ${agentId}`;
            agentSpecialtyEl.textContent = 'Erro ao carregar dados';
        }
    }
    
    function loadConversations(agentId) {
        try {
            // Carregar dados do localStorage
            const agentsData = JSON.parse(localStorage.getItem('agentsData') || '[]');
            
            if (!agentsData.length) {
                throw new Error('Nenhum dado encontrado');
            }
            
            // Filtrar conversas deste agente e formatá-las
            conversations = agentsData
                .filter(conv => conv.instancia === agentId)
                .map(conv => {
                    const success = conv.relatorio[0]?.json?.output?.sucesso === true;
                    const date = new Date(conv.created_at).toLocaleDateString('pt-BR');
                    
                    return {
                        id: conv.id,
                        date: date,
                        status: success ? 'success' : 'failure',
                        duration: `${conv.tempo}m`,
                        rawData: conv
                    };
                });
                
            // Ordenar conversas (mais recentes primeiro)
            conversations.sort((a, b) => b.id - a.id);
            
            // Limpar lista atual
            conversationsListEl.innerHTML = '';
            
            // Mostrar mensagem se não houver conversas
            if (conversations.length === 0) {
                conversationsListEl.innerHTML = '<div class="empty-state">Nenhuma conversa encontrada para este agente.</div>';
                return;
            }
            
            // Preencher lista de conversas
            conversations.forEach(conversation => {
                const card = createConversationCard(conversation);
                conversationsListEl.appendChild(card);
            });
        } catch (error) {
            console.error('Erro ao carregar conversas:', error);
            conversationsListEl.innerHTML = `
                <div class="error-message">
                    <p><i class="fas fa-exclamation-triangle"></i> Erro ao carregar conversas.</p>
                    <p>Detalhes: ${error.message}</p>
                </div>
            `;
        }
    }
    
    function createConversationCard(conversation) {
        const card = document.createElement('div');
        card.className = 'conversation-card';
        card.setAttribute('data-status', conversation.status);
        card.setAttribute('data-id', conversation.id);
        
        const statusClass = conversation.status === 'success' ? 'status-success' : 'status-failure';
        const statusText = conversation.status === 'success' ? 'Sucesso' : 'Falha';
        
        card.innerHTML = `
            <div class="conversation-info">
                <div class="conversation-id">Conversa #${conversation.id}</div>
                <div class="conversation-date">${conversation.date}</div>
            </div>
            <div class="conversation-stats">
                <div class="conversation-status ${statusClass}">${statusText}</div>
                <div class="conversation-duration">
                    <i class="fas fa-clock"></i> ${conversation.duration}
                </div>
            </div>
        `;
        
        card.addEventListener('click', function() {
            openConversationModal(conversation);
        });
        
        return card;
    }
    
    function filterConversations(status) {
        const cards = document.querySelectorAll('.conversation-card');
        
        cards.forEach(card => {
            if (status === 'all' || card.getAttribute('data-status') === status) {
                card.style.display = '';
            } else {
                card.style.display = 'none';
            }
        });
    }
    
    function openConversationModal(conversation) {
        // Preencher cabeçalho do modal
        modalTitle.textContent = `Conversa #${conversation.id}`;
        modalDate.textContent = conversation.date;
        
        // Status da conversa
        const statusClass = conversation.status === 'success' ? 'status-success' : 'status-failure';
        const statusText = conversation.status === 'success' ? 'Sucesso' : 'Falha';
        modalStatus.className = `conversation-status ${statusClass}`;
        modalStatus.textContent = statusText;
        
        // Limpar conteúdo anterior
        messagesContainer.innerHTML = '';
        
        // Extrair e exibir dados de análise da conversa
        displayConversationAnalytics(conversation.rawData);
        
        // Inicializar o estado do painel de análise
        const modalContainer = document.querySelector('.modal-container');
        if (analyticsVisible) {
            modalContainer.classList.remove('analytics-hidden');
            toggleAnalyticsBtn.classList.add('active');
            toggleAnalyticsBtn.title = 'Ocultar Análise';
        } else {
            modalContainer.classList.add('analytics-hidden');
            toggleAnalyticsBtn.classList.remove('active');
            toggleAnalyticsBtn.title = 'Mostrar Análise';
        }
        
        // Gerar e adicionar mensagens da conversa
        const messages = generateConversationMessages(conversation);
        messages.forEach(message => {
            const messageElement = document.createElement('div');
            messageElement.className = `message ${message.sender}`;
            
            messageElement.innerHTML = `
                <div class="message-content">
                    <div class="message-avatar">
                        ${message.sender === 'agent' ? 
                            '<i class="fas fa-robot"></i>' : 
                            '<i class="fas fa-user"></i>'}
                    </div>
                    <div class="message-bubble">
                        <div class="message-text">${message.text}</div>
                        <div class="message-time">${message.time}</div>
                    </div>
                </div>
            `;
            
            messagesContainer.appendChild(messageElement);
        });
        
        // Exibir o modal
        modal.style.display = 'block';
        
        // Rolar para o topo da lista de mensagens
        messagesContainer.scrollTop = 0;
    }
    
    function closeModal() {
        modal.style.display = 'none';
    }
    
    // Função para exibir os dados de análise da conversa
    function displayConversationAnalytics(conversationData) {
        // Elementos que vamos atualizar
        const deslizesEl = document.getElementById('conversation-deslizes');
        const sugestoesEl = document.getElementById('conversation-sugestoes');
        const melhoriasEl = document.getElementById('conversation-melhorias');
        const satisfeitoEl = document.getElementById('conversation-satisfeito');
        
        // Extrair dados do relatório
        const relatorio = conversationData.relatorio && conversationData.relatorio[0]?.json?.output;
        
        if (relatorio) {
            // Deslizes
            const deslizes = relatorio.deslizes;
            if (deslizes && deslizes !== '{}') {
                try {
                    // Tentar analisar como JSON se for uma string JSON
                    const deslizesObj = typeof deslizes === 'string' ? JSON.parse(deslizes) : deslizes;
                    deslizesEl.textContent = Object.keys(deslizesObj).length > 0 
                        ? JSON.stringify(deslizesObj, null, 2) 
                        : "Nenhum deslize identificado";
                } catch (e) {
                    // Se não for um JSON válido, exibir como texto
                    deslizesEl.textContent = deslizes !== '{}' ? deslizes : "Nenhum deslize identificado";
                }
            } else {
                deslizesEl.textContent = "Nenhum deslize identificado";
            }
            
            // Sugestões
            if (relatorio.sugestao && relatorio.sugestao.trim()) {
                sugestoesEl.textContent = relatorio.sugestao;
            } else {
                sugestoesEl.textContent = "Nenhuma sugestão disponível";
            }
            
            // Melhorias
            if (relatorio.melhorias && relatorio.melhorias.trim()) {
                melhoriasEl.textContent = relatorio.melhorias;
            } else {
                melhoriasEl.textContent = "Nenhuma melhoria sugerida";
            }
            
            // Cliente satisfeito
            const clienteSatisfeito = relatorio.satisfeito;
            satisfeitoEl.textContent = clienteSatisfeito ? "Sim" : "Não";
            satisfeitoEl.className = `analytics-status status-${clienteSatisfeito}`;
        } else {
            // Se não houver relatório, definir valores padrão
            deslizesEl.textContent = "Sem dados de análise disponíveis";
            sugestoesEl.textContent = "Sem dados de análise disponíveis";
            melhoriasEl.textContent = "Sem dados de análise disponíveis";
            satisfeitoEl.textContent = "Sem dados";
            satisfeitoEl.className = 'analytics-status';
        }
    }
    
    function generateConversationMessages(conversation) {
        const rawData = conversation.rawData;
        const messages = [];
        const clientMessages = rawData.texto_cliente || [];
        const agentMessages = rawData.texto_agente || [];
        
        // Determinar o número máximo de mensagens
        const maxMessages = Math.max(clientMessages.length, agentMessages.length);
        
        // Gerar um timestamp base para a conversa (10:00)
        let baseTime = new Date();
        baseTime.setHours(10, 0, 0, 0);
        
        // Intercalar mensagens de cliente e agente
        for (let i = 0; i < maxMessages; i++) {
            // Mensagem do cliente (se existir)
            if (i < clientMessages.length && clientMessages[i][0]) {
                let clientTime = new Date(baseTime);
                clientTime.setMinutes(baseTime.getMinutes() + (i * 2));
                
                messages.push({
                    sender: 'client',
                    text: replaceClientPlaceholders(clientMessages[i][0]),
                    time: formatTime(clientTime)
                });
            }
            
            // Mensagem do agente (se existir)
            if (i < agentMessages.length && agentMessages[i][0]) {
                let agentTime = new Date(baseTime);
                agentTime.setMinutes(baseTime.getMinutes() + (i * 2) + 1);
                
                messages.push({
                    sender: 'agent',
                    text: formatAgentText(agentMessages[i][0]),
                    time: formatTime(agentTime)
                });
            }
        }
        
        return messages;
    }
    
    // Função auxiliar para formatar a hora
    function formatTime(date) {
        return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }
    
    // Função para substituir placeholders específicos nas mensagens do cliente
    function replaceClientPlaceholders(text) {
        // Substitui "{print}" por uma mensagem genérica sobre print de matrícula
        if (text === "{print}") {
            return "[Print da matrícula]";
        }
        return text;
    }
    
    // Função para formatar texto do agente (converter markdown para HTML)
    function formatAgentText(text) {
        // Substituir asteriscos por tags de negrito
        return text.replace(/\*([^*]+)\*/g, '<strong>$1</strong>');
    }
    
    // Função para alternar a visibilidade do painel de análise
    function toggleAnalytics() {
        analyticsVisible = !analyticsVisible;
        
        const modalContainer = document.querySelector('.modal-container');
        if (analyticsVisible) {
            modalContainer.classList.remove('analytics-hidden');
            toggleAnalyticsBtn.classList.add('active');
            toggleAnalyticsBtn.title = 'Ocultar Análise';
        } else {
            modalContainer.classList.add('analytics-hidden');
            toggleAnalyticsBtn.classList.remove('active');
            toggleAnalyticsBtn.title = 'Mostrar Análise';
        }
    }
});
