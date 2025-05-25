const chatBody = document.querySelector(".chat-body");
const messageInput = document.querySelector(".message-input");
const sendMessageButton = document.querySelector("#send-message");
const fileInput = document.getElementById('file-input');
const fileUploadWrapper = document.querySelector("#file-upload-wrapper");
const fileCancelButton = document.querySelector("#file-cancel");
const zoomOverlay = document.getElementById('zoom-overlay');
const chatForm = document.querySelector('form'); // Assuming the form has no id

const API_KEY = "AIzaSyALrt7xajZDZQYmDCAdXKK2YYMjOAU24jY";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

const userData = {
    message: null,
    file: {
        data: null,
        mime_type: null,
    },
};

const chatHistory = [];
const initialInputHeight = messageInput.scrollHeight;

function createFilePreview(file) {
    const preview = document.createElement('div');
    preview.className = 'file-preview';

    if (file.type.startsWith('image/')) {
        const img = document.createElement('img');
        img.src = URL.createObjectURL(file);
        img.onclick = (e) => {
            const zoomedImg = document.createElement('img');
            zoomedImg.src = e.target.src;
            zoomOverlay.innerHTML = '';
            zoomOverlay.appendChild(zoomedImg);
            zoomOverlay.classList.add('active');
            e.stopPropagation();
        };
        preview.appendChild(img);
    } else if (file.type === 'application/pdf') {
        const embed = document.createElement('embed');
        embed.src = URL.createObjectURL(file);
        embed.className = 'pdf-preview';
        embed.type = 'application/pdf';
        preview.appendChild(embed);
    }

    return preview;
}

// Close zoom overlay when clicking outside
zoomOverlay.addEventListener('click', (e) => {
    if (e.target === zoomOverlay) {
        zoomOverlay.classList.remove('active');
        setTimeout(() => {
            zoomOverlay.innerHTML = '';
        }, 300);
    }
});

const createMessageElement = (content, ...classes) => {
    const div = document.createElement("div");
    div.classList.add("message", ...classes);
    div.innerHTML = content;
    return div;
};

async function generateBotResponse(incomingMessageDiv) {
    const messageElement = incomingMessageDiv.querySelector(".message-text");

    chatHistory.push({
        role: "user",
        parts: [
            { text: userData.message },
            ...(userData.file.data ? [{ inline_data: userData.file }] : []),
        ],
    });

    const requestOptions = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: chatHistory,
        }),
    };

    try {
        const response = await fetch(API_URL, requestOptions);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error.message);

        const apiResponseText = data.candidates[0].content.parts[0].text
            .replace(/\*\*(.*?)\*\*/g, "$1")
            .trim();
        messageElement.innerText = apiResponseText;

        chatHistory.push({
            role: "model",
            parts: [{ text: apiResponseText }],
        });
    } catch (error) {
        console.error(error);
        messageElement.innerText = error.message;
        messageElement.style.color = "#ff0000";
    } finally {
        incomingMessageDiv.classList.remove("thinking");
        chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });
    }
}

const handleOutgoingMessage = (e) => {
    e.preventDefault();
    userData.message = messageInput.value.trim();
    messageInput.value = "";
    messageInput.dispatchEvent(new Event("input"));

    const messageContent = `<div class="message-text"></div>
                          ${userData.file.data
            ? `<img src="data:${userData.file.mime_type};base64,${userData.file.data}" class="attachment" />`
            : ""}`;
    const outgoingMessageDiv = createMessageElement(messageContent, "user-message");
    outgoingMessageDiv.querySelector(".message-text").textContent = userData.message;
    chatBody.appendChild(outgoingMessageDiv);
    chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });

    setTimeout(() => {
        const messageContent = `<svg class="bot-avatar" xmlns="http://ww.w3.org/2000/svg" width="0" height="0" viewBox="0 0 1024 1024">
            <path d="M738.3 287.6H285.7c-59 0-106.8 47.8-106.8 106.8v303.1c0 59 47.8 106.8 106.8 106.8h81.5v111.1c0 .7.8 1.1 1.4.7l166.9-110.6 41.8-.8h117.4l43.6-.4c59 0 106.8-47.8 106.8-106.8V394.5c0-59-47.8-106.9-106.8-106.9zM351.7 448.2c0-29.5 23.9-53.5 53.5-53.5s53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5-53.5-23.9-53.5-53.5zm157.9 267.1c-67.8 0-123.8-47.5-132.3-109h264.6c-8.6 61.5-64.5 109-132.3 109zm110-213.7c-29.5 0-53.5-23.9-53.5-53.5s23.9-53.5 53.5-53.5 53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5z"></path>
          </svg>
          <div class="message-text">
            <div class="thinking-indicator">
              <div class="dot"></div>
              <div class="dot"></div>
              <div class="dot"></div>
            </div>
          </div>`;
        const incomingMessageDiv = createMessageElement(messageContent, "bot-message", "thinking");
        chatBody.appendChild(incomingMessageDiv);
        chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });
        generateBotResponse(incomingMessageDiv);
    }, 600);
};

// Replace existing event listeners with these
messageInput.addEventListener("keydown", (e) => {
    const userMessage = e.target.value.trim();
    if (e.key === "Enter" && userMessage && !e.shiftKey && window.innerWidth > 768) {
        handleOutgoingMessage(e);
    }
});

// Clear previous event listeners (fix incorrect removal)
fileInput.removeEventListener('change', fileInput.onchange);
chatForm.removeEventListener('submit', chatForm.onsubmit);

// Fix file input handler
fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        userData.file = {
            data: event.target.result.split(",")[1],
            mime_type: file.type,
        };

        userData.message = `file attached: ${file.name}`;
        
        const outgoingMessageDiv = createMessageElement(`
            <div class="message-text" style="text-align: center;">${userData.message}</div>
        `, "user-message");
        
        const filePreview = createFilePreview(file);
        filePreview.style.justifyContent = 'center';
        outgoingMessageDiv.appendChild(filePreview);
        
        chatBody.appendChild(outgoingMessageDiv);
        chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });

        // Create bot response
        const botMessageDiv = createMessageElement(`
            <div class="message-text">
                <div class="thinking-indicator">
                    <div class="dot"></div>
                    <div class="dot"></div>
                    <div class="dot"></div>
                </div>
            </div>`, "bot-message", "thinking");
        
        chatBody.appendChild(botMessageDiv);
        generateBotResponse(botMessageDiv);
        
        // Reset
        fileInput.value = '';
        setTimeout(() => {
            userData.file = { data: null, mime_type: null };
        }, 100);
    };

    reader.readAsDataURL(file);
});

// Update the form submission handler
chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (messageInput.value.trim()) {
        handleOutgoingMessage(e);
    }
});

// Add blank page functionality
function blank() {
    const newWindow = window.open("about:blank", "_blank");
    if (newWindow) {
        const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
            .map((link) => `<link rel="stylesheet" href="${link.href}">`)
            .join("\n");

        const inlineScripts = Array.from(document.querySelectorAll("script:not([src])"))
            .map((script) => `<script>${script.innerHTML}</script>`)
            .join("\n");

        const externalScripts = Array.from(document.querySelectorAll("script[src]"))
            .map((script) => `<script src="${script.src}"></script>`)
            .join("\n");

        const htmlContent = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>IXL</title>
                <link rel="icon" href="https://www.ixl.com/favicon.ico"/>
                ${styles}
            </head>
            <body>
                ${document.body.innerHTML}
                ${inlineScripts}
                ${externalScripts}
            </body>
            </html>
        `;
        newWindow.document.open();
        newWindow.document.write(htmlContent);
        newWindow.document.close();
    } else {
        alert("allow popups plz");
    }
}

// Add event listeners
sendMessageButton.addEventListener("click", (e) => handleOutgoingMessage(e));
document.querySelector("#redirect-button").addEventListener("click", blank);

messageInput.addEventListener("input", (e) => {
    messageInput.style.height = `${initialInputHeight}px`;
    messageInput.style.height = `${messageInput.scrollHeight}px`;
});
