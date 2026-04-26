const chatBox = document.getElementById('chat-box');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');

sendBtn.addEventListener('click', sendMessage);
userInput.addEventListener('keypress', e => { if(e.key==='Enter') sendMessage(); });

async function sendMessage() {
  const message = userInput.value.trim();
  if(!message) return;

  appendMessage(message, 'user-msg');
  userInput.value='';

  try {
    const res = await fetch('http://localhost:5000/chat', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ user: "user1", message })
    });

    const data = await res.json();
    appendMessage(data.response,'bot-msg');

    if (data.suggestions && data.suggestions.length > 0) {
      const sugDiv = document.createElement('div');
      sugDiv.className = 'bot-msg';
      sugDiv.innerHTML = "Suggestions: <ul>" + data.suggestions.map(s => `<li>${s}</li>`).join('') + "</ul>";
      chatBox.appendChild(sugDiv);
    }

  } catch(err) {
    appendMessage("Error: Could not reach server",'bot-msg');
  }
}

function appendMessage(msg,className){
  const div = document.createElement('div');
  div.textContent=msg;
  div.className=className;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}
