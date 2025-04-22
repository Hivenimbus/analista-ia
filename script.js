document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const satisfactionFilter = document.getElementById('satisfactionFilter');
    const timeFilter = document.getElementById('timeFilter');
    
    // Search functionality
    function performSearch() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        const satisfactionValue = satisfactionFilter.value;
        const timeValue = timeFilter.value;
        
        const agentCards = document.querySelectorAll('.agent-card');
        agentCards.forEach(card => {
            const agentName = card.querySelector('h3').textContent.toLowerCase();
            const satisfactionEl = card.querySelector('.stat .value');
            const timeEl = card.querySelectorAll('.stat .value')[2];
            
            // Extrair valor numérico da satisfação (remover o %)
            const satisfactionPercent = parseInt(satisfactionEl.textContent);
            
            // Extrair valor do tempo (assumindo formato como "2.3m")
            const timeMinutes = parseFloat(timeEl.textContent);
            
            // Verificar condições de filtro para satisfação
            let satisfactionMatch = true;
            if (satisfactionValue === 'baixa') {
                satisfactionMatch = satisfactionPercent < 80;
            } else if (satisfactionValue === 'media') {
                satisfactionMatch = satisfactionPercent >= 80 && satisfactionPercent <= 90;
            } else if (satisfactionValue === 'alta') {
                satisfactionMatch = satisfactionPercent > 90;
            }
            
            // Verificar condições de filtro para tempo
            let timeMatch = true;
            if (timeValue === 'rapido') {
                timeMatch = timeMinutes < 2;
            } else if (timeValue === 'medio') {
                timeMatch = timeMinutes >= 2 && timeMinutes <= 3;
            } else if (timeValue === 'lento') {
                timeMatch = timeMinutes > 3;
            }
            
            // Aplicar todos os filtros
            const nameMatch = agentName.includes(searchTerm) || searchTerm === '';
            
            if (nameMatch && satisfactionMatch && timeMatch) {
                card.classList.remove('hidden');
            } else {
                card.classList.add('hidden');
            }
        });
        
        // Verificar se há resultados visíveis
        const visibleCards = document.querySelectorAll('.agent-card:not(.hidden)');
        const noResultsMessage = document.getElementById('noResultsMessage');
        
        if (visibleCards.length === 0) {
            // Criar mensagem de "nenhum resultado" se não existir
            if (!noResultsMessage) {
                const message = document.createElement('div');
                message.id = 'noResultsMessage';
                message.className = 'no-results';
                message.textContent = 'Nenhum agente encontrado com os filtros selecionados.';
                
                const agentsList = document.querySelector('.agents-list');
                agentsList.parentNode.insertBefore(message, agentsList.nextSibling);
            } else {
                noResultsMessage.style.display = 'block';
            }
        } else if (noResultsMessage) {
            noResultsMessage.style.display = 'none';
        }
    }
    
    // Event listeners
    searchButton.addEventListener('click', performSearch);
    
    searchInput.addEventListener('keyup', function(event) {
        if (event.key === 'Enter') {
            performSearch();
        }
    });
    
    // Real-time search as user types or changes filters
    searchInput.addEventListener('input', performSearch);
    satisfactionFilter.addEventListener('change', performSearch);
    timeFilter.addEventListener('change', performSearch);
    
    // Function to fetch agents data from webhook
    async function fetchAgentsData() {
        try {
            const webhookUrl = 'https://n8n.hivebot.cloud/webhook/3618ca3b-6cfb-47ab-9579-157a30922a1c';
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({})
            });
            
            if (!response.ok) {
                throw new Error('Erro ao buscar dados do webhook: ' + response.status);
            }
            
            const data = await response.json();
            console.log('Dados recebidos do webhook:', data);
            
            // Processar os dados para criar um resumo dos agentes
            const agentsMap = new Map();
            
            data.forEach(conversation => {
                const agentName = conversation.instancia;
                const success = conversation.relatorio[0]?.json?.output?.sucesso || false;
                const tiempo = conversation.tempo;
                
                // Se o agente já existe no mapa, atualizar suas estatísticas
                if (agentsMap.has(agentName)) {
                    const agent = agentsMap.get(agentName);
                    agent.conversations += 1;
                    agent.successCount += success ? 1 : 0;
                    agent.totalTime += tiempo;
                    agent.conversationIds.push(conversation.id);
                } else {
                    // Criar um novo registro de agente
                    agentsMap.set(agentName, {
                        name: agentName,
                        conversations: 1,
                        successCount: success ? 1 : 0,
                        totalTime: tiempo,
                        conversationIds: [conversation.id],
                        specialty: 'Atendimento',
                    });
                }
            });
            
            // Converter o mapa para um array e calcular as métricas finais
            const agents = Array.from(agentsMap.values()).map(agent => {
                const satisfactionRate = Math.round((agent.successCount / agent.conversations) * 100);
                const avgTime = (agent.totalTime / agent.conversations).toFixed(1);
                
                return {
                    ...agent,
                    satisfaction: satisfactionRate,
                    avgTime: `${avgTime}m`,
                    // Salvar dados completos para permitir acesso posterior
                    rawData: data.filter(conv => conv.instancia === agent.name)
                };
            });
            
            // Armazenar os dados completos em localStorage para acesso na página de detalhes
            localStorage.setItem('agentsData', JSON.stringify(data));
            
            // Renderizar a lista de agentes
            renderAgentsList(agents);
            
            return agents;
        } catch (error) {
            console.error('Erro ao obter dados dos agentes:', error);
            const agentsList = document.querySelector('.agents-list');
            agentsList.innerHTML = `
                <div class="error-message">
                    <p><i class="fas fa-exclamation-triangle"></i> Erro ao carregar dados dos agentes.</p>
                    <p>Detalhes: ${error.message}</p>
                </div>
            `;
            return [];
        }
    }
    
    // Function to render agents list based on data
    function renderAgentsList(agents) {
        // Clear existing list
        const agentsList = document.querySelector('.agents-list');
        agentsList.innerHTML = '';
        
        // Add each agent to the list
        agents.forEach(agent => {
            const card = createAgentCard(agent);
            agentsList.appendChild(card);
        });
    }
    
    // Function to create an agent card element
    function createAgentCard(agent) {
        const card = document.createElement('div');
        card.className = 'agent-card';
        card.setAttribute('data-id', agent.name);
        card.classList.add('clickable');
        
        card.innerHTML = `
            <div class="agent-info">
                <h3>${agent.name}</h3>
                <p>Especialidade: ${agent.specialty}</p>
            </div>
            <div class="stats">
                <div class="stat">
                    <span class="value">${agent.satisfaction}%</span>
                    <span class="label">Satisfação</span>
                </div>
                <div class="stat">
                    <span class="value">${agent.conversations}</span>
                    <span class="label">Conversas</span>
                </div>
                <div class="stat">
                    <span class="value">${agent.avgTime}</span>
                    <span class="label">Tempo Médio</span>
                </div>
            </div>
        `;
        
        // Adicionar evento de clique que redireciona para a página de detalhes
        card.addEventListener('click', function() {
            window.location.href = `agent-details.html?id=${agent.name}`;
        });
        
        return card;
    }
    
    // Initialize - Fetch data from webhook
    fetchAgentsData();
});
