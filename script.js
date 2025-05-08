document.addEventListener('DOMContentLoaded', () => {
    // Elementos del DOM
    const joinScreen = document.getElementById('join-screen');
    const waitingScreen = document.getElementById('waiting-screen');
    const questionScreen = document.getElementById('question-screen');
    const answerScreen = document.getElementById('answer-screen');
    const voteScreen = document.getElementById('vote-screen');
    const resultsScreen = document.getElementById('results-screen');
    const gameOverScreen = document.getElementById('game-over-screen');
    
    const playerNameInput = document.getElementById('player-name');
    const joinBtn = document.getElementById('join-btn');
    const nameTakenMsg = document.getElementById('name-taken');
    const playersList = document.getElementById('players');
    const startGameBtn = document.getElementById('start-game-btn');
    
    const questionInput = document.getElementById('question-input');
    const submitQuestionBtn = document.getElementById('submit-question-btn');
    const questionTimer = document.getElementById('question-timer');
    
    const currentQuestion = document.getElementById('current-question');
    const answerInput = document.getElementById('answer-input');
    const submitAnswerBtn = document.getElementById('submit-answer-btn');
    const answerTimer = document.getElementById('answer-timer');
    
    const answersToVote = document.getElementById('answers-to-vote');
    const voteTimer = document.getElementById('vote-timer');
    
    const rankedAnswers = document.getElementById('ranked-answers');
    const scoreboardBody = document.getElementById('scoreboard-body');
    const finalScoreboardBody = document.getElementById('final-scoreboard-body');
    
    // Conexión Socket.io
    const socket = io("https://back-preguntas-respuestas.onrender.com");
    
    // Variables de estado
    let playerName = '';
    let isAdmin = false;
    let currentPhase = '';
    
    // Event listeners
    joinBtn.addEventListener('click', joinGame);
    startGameBtn.addEventListener('click', startGame);
    submitQuestionBtn.addEventListener('click', submitQuestion);
    submitAnswerBtn.addEventListener('click', submitAnswer);
    playerNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') joinGame();
    });
    questionInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submitQuestion();
        }
    });
    answerInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submitAnswer();
        }
    });
    
    // Socket.io listeners
    socket.on('nameTaken', () => {
        nameTakenMsg.style.display = 'block';
    });
    
    socket.on('joined', (data) => {
        playerName = data.name;
        isAdmin = data.isAdmin;
        
        joinScreen.classList.add('hidden');
        waitingScreen.classList.remove('hidden');
        
        if (isAdmin) {
            startGameBtn.classList.remove('hidden');
        }
        
        updatePlayers(data.gameState.players.map(p => p.name));
    });
    
    socket.on('updatePlayers', (players) => {
        updatePlayers(players);
    });
    
    socket.on('gamePhaseChanged', (data) => {
        console.log("Fase cambiada a:", data.phase, "Datos recibidos:", data);


        // CONSOLA
        if (data.phase === 'vote') {
            console.log("Respuestas recibidas para votar:", data.answers);
        }
        currentPhase = data.phase;
        //

        // Resetear botones cuando cambia la fase
        submitQuestionBtn.disabled = false;
        submitQuestionBtn.textContent = "Enviar pregunta";
        submitQuestionBtn.style.backgroundColor = "";
        submitAnswerBtn.disabled = false;
        submitAnswerBtn.textContent = "Enviar respuesta";
        submitAnswerBtn.style.backgroundColor = "";
    
        // Ocultar todas las pantallas primero
        waitingScreen.classList.add('hidden');
        questionScreen.classList.add('hidden');
        answerScreen.classList.add('hidden');
        voteScreen.classList.add('hidden');
        resultsScreen.classList.add('hidden');
        gameOverScreen.classList.add('hidden');
        
        // Mostrar la pantalla correspondiente a la fase actual
        switch (currentPhase) {
            case 'waiting':
                waitingScreen.classList.remove('hidden');
                break;
            case 'question':
                questionScreen.classList.remove('hidden');
                questionTimer.textContent = data.timeLeft;
                questionInput.value = '';
                break;

            case 'answer':
                answerScreen.classList.remove('hidden');
                currentQuestion.innerHTML = `<strong>Pregunta de ${data.question.author}:</strong> ${data.question.text}`;
                answerTimer.textContent = data.timeLeft;
                answerInput.value = '';
                
                // Ocultar elementos si es el autor de la pregunta
                if (playerName === data.question.author) {
                    answerInput.style.display = 'none';
                    submitAnswerBtn.style.display = 'none';
                    document.querySelector('#answer-screen p:nth-of-type(2)').textContent = 
                        "Eres el autor de esta pregunta, espera mientras los demás responden.";
                } else {
                    answerInput.style.display = 'block';
                    submitAnswerBtn.style.display = 'block';
                }
                break;
            
            case 'vote':
                voteScreen.classList.remove('hidden');
                voteTimer.textContent = data.timeLeft;
                renderAnswersToVote(data.answers);
                break;
            case 'results':
                resultsScreen.classList.remove('hidden');
                renderRankedAnswers(data.rankedAnswers);
                renderScoreboard(data.scores);
                break;
            case 'gameOver':
                gameOverScreen.classList.remove('hidden');
                renderFinalScoreboard(data.scores);
                break;
        }
    });
    
    socket.on('timerUpdate', (timeLeft) => {
        switch (currentPhase) {
            case 'question':
                questionTimer.textContent = timeLeft;
                break;
            case 'answer':
                answerTimer.textContent = timeLeft;
                break;
            case 'vote':
                voteTimer.textContent = timeLeft;
                break;
        }
    });
    
    // Funciones
    function joinGame() {
        const name = playerNameInput.value.trim();
        if (name) {
            socket.emit('join', name);
        }
    }
    
    function startGame() {
        socket.emit('startGame');
    }
    
    function submitQuestion() {
        const question = questionInput.value.trim();
        if (question) {
            socket.emit('submitQuestion', question);
            submitQuestionBtn.disabled = true;  // Deshabilitar el botón
            submitQuestionBtn.textContent = "Pregunta enviada";  // Cambiar texto
            submitQuestionBtn.style.backgroundColor = "#6c757d";  // Cambiar color
        }
    }
    
    function submitAnswer() {
        const answer = answerInput.value.trim();
        if (answer) {
            socket.emit('submitAnswer', answer);
            submitAnswerBtn.disabled = true;  // Deshabilitar el botón
            submitAnswerBtn.textContent = "Respuesta enviada";  // Cambiar texto
            submitAnswerBtn.style.backgroundColor = "#6c757d";  // Cambiar color
        }
    }
    
    function updatePlayers(players) {
        playersList.innerHTML = '';
        players.forEach(player => {
            const li = document.createElement('li');
            li.textContent = player;
            if (player === 'Facu') {
                li.style.fontWeight = 'bold';
                li.style.color = '#28a745';
            }
            playersList.appendChild(li);
        });
    }
    
    function renderAnswersToVote(answers) {
        console.log("Renderizando respuestas para votar:", answers); // DEBUG
        
        answersToVote.innerHTML = '';
        
        if (!answers || Object.keys(answers).length === 0) {
            answersToVote.innerHTML = '<p>No hay respuestas disponibles para votar.</p>';
            return;
        }
        
        Object.entries(answers).forEach(([player, answer]) => {
            const div = document.createElement('div');
            div.className = 'answer-option';
            div.innerHTML = `<p><strong>${player}:</strong> ${answer}</p>`;
            
            div.addEventListener('click', () => {
                document.querySelectorAll('.answer-option').forEach(el => {
                    el.classList.remove('selected');
                });
                div.classList.add('selected');
                socket.emit('submitVote', player);
            });
            
            answersToVote.appendChild(div);
        });
    }
    
    function renderRankedAnswers(rankedAnswers) {
        rankedAnswers.innerHTML = '';
        
        if (!rankedAnswers || rankedAnswers.length === 0) {
            rankedAnswers.innerHTML = '<p>No hay respuestas para mostrar.</p>';
            return;
        }
        
        rankedAnswers.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = 'ranked-answer';
            
            // Ícono de podio para los primeros 3 lugares
            let podiumIcon = '';
            if (index === 0) podiumIcon = '🥇';
            else if (index === 1) podiumIcon = '🥈';
            else if (index === 2) podiumIcon = '🥉';
            
            div.innerHTML = `
                <p><strong>${podiumIcon} #${index + 1}: ${item.player}</strong> (${item.votes} voto${item.votes !== 1 ? 's' : ''})</p>
                <p>${item.answer}</p>
            `;
            rankedAnswers.appendChild(div);
        });
    }
    
    function renderScoreboard(scores) {
        const tbody = document.getElementById('scoreboard-body');
        if (!tbody) return; // Validación de seguridad
        
        tbody.innerHTML = ''; // Limpiar tabla
        
        // Ordenar jugadores por puntaje (mayor a menor)
        const sortedPlayers = Object.entries(scores || {}).sort((a, b) => b[1] - a[1]);
        
        // Generar filas de la tabla
        sortedPlayers.forEach(([player, points]) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${player}</td>
                <td>${points}</td>
            `;
            tbody.appendChild(row);
        });
    }

    // Ordenar jugadores por puntaje (de mayor a menor)
    const sortedPlayers = Object.entries(scores).sort((a, b) => b[1] - a[1]);

    // Llenar la tabla
    sortedPlayers.forEach(([player, points]) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${player}</td>
            <td>${points}</td>
        `;
        scoreboardBody.appendChild(row);
    });
}
    
    function renderFinalScoreboard(scores) {
        finalScoreboardBody.innerHTML = '';
        const sortedPlayers = Object.entries(scores).sort((a, b) => b[1] - a[1]);
        sortedPlayers.forEach(([player, score], index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${index === 0 ? '🏆 ' : ''}${player}</td>
                <td>${score}</td>
            `;
            if (player === 'Facu') {
                tr.style.fontWeight = 'bold';
                tr.querySelector('td:first-child').style.color = '#28a745';
            }
            finalScoreboardBody.appendChild(tr);
        });
    }
});
