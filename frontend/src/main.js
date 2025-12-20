const API_URL = "http://127.0.0.1:8000"; 

window.addEventListener("DOMContentLoaded", () => {
    fetchTasks();
    setupDragAndDrop();

    // Setup Add Button
    const addBtn = document.getElementById("addBtn");
    if (addBtn) {
        addBtn.addEventListener("click", addTask);
    }
});

// --- CORE FUNCTIONS ---

async function addTask() {
    const input = document.getElementById("taskInput");
    const title = input.value;
    if (!title) return;

    await fetch(`${API_URL}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title })
    });
    input.value = "";
    fetchTasks();
}

async function fetchTasks() {
    const response = await fetch(`${API_URL}/tasks`);
    const tasks = await response.json();

    // Clear columns
    document.getElementById("list-todo").innerHTML = "";
    document.getElementById("list-doing").innerHTML = "";
    document.getElementById("list-done").innerHTML = "";

    tasks.forEach(task => createTaskElement(task));
}

function createTaskElement(task) {
    const card = document.createElement("div");
    card.classList.add("card");
    card.id = "task-" + task.id;
    card.setAttribute("draggable", "true"); 

    // 1. Create the Text inside the card
    const textSpan = document.createElement("span");
    textSpan.innerText = task.title;
    card.appendChild(textSpan);

    // 2. Create the DELETE Button (The Red X)
    const deleteBtn = document.createElement("button");
    deleteBtn.innerText = "×"; // This is a special multiplication sign, looks nicer
    deleteBtn.classList.add("delete-btn");

    // 3. Delete Logic
    deleteBtn.addEventListener("click", async (e) => {
        e.stopPropagation(); // Stop the click from triggering anything else
        
        // Ask for confirmation (Optional, but safe)
        if (confirm("Are you sure you want to delete this task?")) {
            // Remove from Screen immediately
            card.remove();

            // Tell Python to delete from Database
            await fetch(`${API_URL}/tasks/${task.id}`, {
                method: "DELETE"
            });
        }
    });

    card.appendChild(deleteBtn);

    // --- OLD DRAG & RIGHT-CLICK LOGIC (Keep this!) ---
    card.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("text/plain", String(task.id));
        e.target.style.opacity = "0.5"; 
    });

    card.addEventListener("dragend", (e) => {
        e.target.style.opacity = "1";
    });

    card.addEventListener("contextmenu", (e) => {
        e.preventDefault(); 
        moveTaskNext(task); 
    });

    // Place in correct column
    const listId = `list-${task.status}`;
    const column = document.getElementById(listId);
    if (column) column.appendChild(card);
}
function setupDragAndDrop() {
    // Target the RED BOXES directly
    const lists = document.querySelectorAll(".task-list");

    lists.forEach(list => {
        // Allow Dropping
        list.addEventListener("dragover", (e) => {
            e.preventDefault(); 
            list.style.background = "#ffe6e6"; // Red highlight
        });

        list.addEventListener("dragleave", () => {
            list.style.background = "transparent";
        });

        // Handle Drop
        list.addEventListener("drop", async (e) => {
            e.preventDefault();
            list.style.background = "transparent";

            const taskId = e.dataTransfer.getData("text/plain");
            const newStatus = list.id.replace("list-", ""); // Get "todo", "doing", or "done"

            // Move visually instantly
            const card = document.getElementById("task-" + taskId);
            list.appendChild(card);

            // Update Database
            await updateTaskStatus(taskId, newStatus);
        });
    });
}

// Helper to move task to next stage (Right Click)
async function moveTaskNext(task) {
    let newStatus = "doing";
    if (task.status === "doing") newStatus = "done";
    if (task.status === "done") newStatus = "todo"; // Cycle back

    // Move visually
    const card = document.getElementById("task-" + task.id);
    const newList = document.getElementById(`list-${newStatus}`);
    newList.appendChild(card);

    // Update DB
    task.status = newStatus; // Update local memory
    await updateTaskStatus(task.id, newStatus);
}

async function updateTaskStatus(id, status) {
    await fetch(`${API_URL}/tasks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: status })
    });
}