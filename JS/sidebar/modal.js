/**
 * Shows an input modal dialog.
 * @param {Object} options - Modal options (title, label, value, placeholder, type, validate).
 * @returns {Promise<string|null>} Resolves to input value or null if cancelled.
 */
export function showInputModal({ title, label, value = "", placeholder = "", type = "text", validate })
{
    return new Promise((resolve) =>
    {
        document.getElementById("podawful-generic-modal")?.remove();

        const modal = document.createElement("div");
        modal.id = "podawful-generic-modal";
        modal.className = "podawful-modal";
        modal.tabIndex = -1;
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('role', 'dialog');
        modal.style.zIndex = '100000'; // Ensure always above tag manager modal

        const box = document.createElement("div");
        box.className = "podawful-modal-box";
        box.innerHTML = `<h3>${escapeHTML(title)}</h3>
            <label>${escapeHTML(label)}</label>
            <input type="${type}" value="${escapeHTML(value)}" placeholder="${escapeHTML(placeholder)}" style="width:100%;margin:8px 0 16px 0;" />
            <div id="modal-error" style="color:var(--error, #c00);display:none;margin-bottom:8px;"></div>
            <div style="text-align:right;">
                <button class="podawful-btn" id="modalCancel">Cancel</button>
                <button class="podawful-btn" id="modalOk">OK</button>
            </div>`;

        modal.appendChild(box);
        document.body.appendChild(modal);

        const input = box.querySelector("input");
        const errorDiv = box.querySelector("#modal-error");
        input.focus();

        function cleanup(val)
        {
            modal.remove();
            resolve(val);
        }

        function handleOk()
        {
            const val = input.value;
            if (validate)
            {
                const result = validate(val);
                if (result !== true)
                {
                    errorDiv.textContent = typeof result === "string" ? result : "Invalid input.";
                    errorDiv.style.display = "block";
                    input.style.borderColor = "var(--error, #c00)";
                    return;
                }
            }
            cleanup(val);
        }

        box.querySelector("#modalCancel").onclick = () => cleanup(null);
        box.querySelector("#modalOk").onclick = handleOk;

        input.addEventListener("keydown", (e) =>
        {
            if (e.key === "Enter") handleOk();
            if (e.key === "Escape") cleanup(null);
        });

        modal.addEventListener("click", (e) =>
        {
            if (e.target === modal) cleanup(null);
        });
    });
}

/**
 * Shows a confirmation modal dialog.
 * @param {Object} options - Modal options (title, message, okText, cancelText, okButtonStyle, cancelButtonStyle).
 * @returns {Promise<boolean>} Resolves to true if confirmed, false if cancelled.
 */
export function showConfirmModal({ title, message, okText = "Delete", cancelText = "Cancel", okButtonStyle = "", cancelButtonStyle = "" })
{
    return new Promise((resolve) =>
    {
        document.getElementById("podawful-generic-modal")?.remove();

        const modal = document.createElement("div");
        modal.id = "podawful-generic-modal";
        modal.className = "podawful-modal";
        modal.tabIndex = -1;
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('role', 'dialog');
        modal.style.zIndex = '100000'; // Ensure always above tag manager modal

        const box = document.createElement("div");
        box.className = "podawful-modal-box";
        box.innerHTML = `<h3>${escapeHTML(title)}</h3>
            <div style="margin-bottom:18px;">${escapeHTML(message)}</div>
            <div style="text-align:right;">
                <button class="podawful-btn" id="modalCancel" style="${cancelButtonStyle}">${escapeHTML(cancelText)}</button>
                <button class="podawful-btn" id="modalOk" style="${okButtonStyle || 'background:var(--error, #c00);color:#fff;border-color:var(--error, #c00);'}">${escapeHTML(okText)}</button>
            </div>`;

        modal.appendChild(box);
        document.body.appendChild(modal);

        function cleanup(val)
        {
            modal.remove();
            resolve(val);
        }

        box.querySelector("#modalCancel").onclick = () => cleanup(false);
        box.querySelector("#modalOk").onclick = () => cleanup(true);

        modal.addEventListener('keydown', (e) =>
        {
            if (e.key === "Escape") cleanup(false);
        });
        modal.addEventListener('click', (e) =>
        {
            if (e.target === modal) cleanup(false);
        });

        // Focus modal for accessibility
        setTimeout(() => modal.focus(), 0);
    });
}

/**
 * Shows a choice modal dialog with 3 options.
 * @param {Object} options - Modal options (title, message, option1, option2, option3).
 * @returns {Promise<string|null>} Resolves to selected option name or null if cancelled.
 */
export function showChoiceModal({ title, message, option1, option2, option3 })
{
    return new Promise((resolve) =>
    {
        document.getElementById("podawful-generic-modal")?.remove();

        const modal = document.createElement("div");
        modal.id = "podawful-generic-modal";
        modal.className = "podawful-modal";
        modal.tabIndex = -1;
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('role', 'dialog');
        modal.style.zIndex = '100000'; // Ensure always above tag manager modal

        const box = document.createElement("div");
        box.className = "podawful-modal-box";
        box.innerHTML = `<h3>${escapeHTML(title)}</h3>
            <div style="margin-bottom:18px;">${escapeHTML(message)}</div>
            <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:18px;">
                <button class="podawful-btn" id="modalOption1" style="width:100%;text-align:left;justify-content:flex-start;">${escapeHTML(option1)}</button>
                <button class="podawful-btn" id="modalOption2" style="width:100%;text-align:left;justify-content:flex-start;">${escapeHTML(option2)}</button>
                <button class="podawful-btn" id="modalOption3" style="width:100%;text-align:left;justify-content:flex-start;">${escapeHTML(option3)}</button>
            </div>
            <div style="text-align:right;">
                <button class="podawful-btn" id="modalCancel">Cancel</button>
            </div>`;

        modal.appendChild(box);
        document.body.appendChild(modal);

        function cleanup(val)
        {
            modal.remove();
            resolve(val);
        }

        box.querySelector("#modalOption1").onclick = () => cleanup(option1);
        box.querySelector("#modalOption2").onclick = () => cleanup(option2);
        box.querySelector("#modalOption3").onclick = () => cleanup(option3);
        box.querySelector("#modalCancel").onclick = () => cleanup(null);

        modal.addEventListener('keydown', (e) =>
        {
            if (e.key === "Escape") cleanup(null);
        });
        modal.addEventListener('click', (e) =>
        {
            if (e.target === modal) cleanup(null);
        });

        // Focus modal for accessibility
        setTimeout(() => modal.focus(), 0);
    });
}

/**
 * Shows a choice modal dialog with 2 options.
 * @param {Object} options - Modal options (title, message, option1, option2).
 * @returns {Promise<string|null>} Resolves to selected option name or null if cancelled.
 */
export function showTwoChoiceModal({ title, message, option1, option2 })
{
    return new Promise((resolve) =>
    {
        document.getElementById("podawful-generic-modal")?.remove();

        const modal = document.createElement("div");
        modal.id = "podawful-generic-modal";
        modal.className = "podawful-modal";
        modal.tabIndex = -1;
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('role', 'dialog');
        modal.style.zIndex = '100000'; // Ensure always above tag manager modal

        const box = document.createElement("div");
        box.className = "podawful-modal-box";
        box.innerHTML = `<h3>${escapeHTML(title)}</h3>
            <div style="margin-bottom:18px;">${escapeHTML(message)}</div>
            <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:18px;">
                <button class="podawful-btn" id="modalOption1" style="width:100%;text-align:left;justify-content:flex-start;">${escapeHTML(option1)}</button>
                <button class="podawful-btn" id="modalOption2" style="width:100%;text-align:left;justify-content:flex-start;">${escapeHTML(option2)}</button>
            </div>
            <div style="text-align:right;">
                <button class="podawful-btn" id="modalCancel">Cancel</button>
            </div>`;

        modal.appendChild(box);
        document.body.appendChild(modal);

        function cleanup(val)
        {
            modal.remove();
            resolve(val);
        }

        box.querySelector("#modalOption1").onclick = () => cleanup(option1);
        box.querySelector("#modalOption2").onclick = () => cleanup(option2);
        box.querySelector("#modalCancel").onclick = () => cleanup(null);

        modal.addEventListener('keydown', (e) =>
        {
            if (e.key === "Escape") cleanup(null);
        });
        modal.addEventListener('click', (e) =>
        {
            if (e.target === modal) cleanup(null);
        });

        // Focus modal for accessibility
        setTimeout(() => modal.focus(), 0);
    });
}

function escapeHTML(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}