// ============================================================
// a_tasks.js — connected to backend (assignments API)
// ============================================================
const API_BASE = '../lms_backend/lms_backend/api';
let questionCount = 0;
let allTasks = [];

// Set current date
document.getElementById('currentDate').textContent = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
});

// Check auth
const currentUser = JSON.parse(sessionStorage.getItem('currentUser')) || JSON.parse(localStorage.getItem('currentUser'));
if (!currentUser) {
    window.location.href = '../login/index.html';
}
if (document.getElementById('adminName')) {
    document.getElementById('adminName').textContent = currentUser ? currentUser.name : 'Admin';
}

// Modal functions
function openModal(modalId) {
    document.getElementById(modalId).classList.add('show');
    if (modalId === 'addTaskModal') {
        questionCount = 0;
        document.getElementById('questionsList').innerHTML = '';
        document.getElementById('addTaskForm').reset();
    }
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
}

window.addEventListener('click', function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('show');
    }
});

// ============================================================
// LOAD COURSES into dropdowns
// ============================================================
async function loadCourseDropdowns() {
    try {
        const res = await fetch(`${API_BASE}/courses/courses.php?action=list`);
        const data = await res.json();
        if (!data.success) return;

        const courses = data.data;
        ['courseFilter', 'taskCourseId'].forEach(selectId => {
            const select = document.getElementById(selectId);
            if (!select) return;
            const firstOpt = select.querySelector('option');
            select.innerHTML = '';
            select.appendChild(firstOpt);
            courses.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.Course_ID;
                opt.textContent = c.Course_Title;
                select.appendChild(opt);
            });
        });
    } catch (err) {
        console.error('Failed to load courses:', err);
    }
}

// ============================================================
// LOAD & RENDER TASKS
// ============================================================
async function loadTasks(courseId) {
    const grid = document.getElementById('tasksGrid');
    grid.innerHTML = '<p style="padding:20px;">Loading tasks...</p>';

    try {
        const url = courseId
            ? `${API_BASE}/assignments/assignments.php?action=list&course_id=${courseId}`
            : `${API_BASE}/assignments/assignments.php?action=list_all`;
        const res = await fetch(url);
        const data = await res.json();

        if (!data.success || data.data.length === 0) {
            grid.innerHTML = '<div class="empty-state"><i class="fas fa-tasks"></i><h3>No Tasks Yet</h3><p>Click the button above to create your first task with questions.</p></div>';
            allTasks = [];
            return;
        }

        allTasks = data.data;
        renderTasks(allTasks);
    } catch (err) {
        grid.innerHTML = '<p style="color:red;padding:20px;">Failed to load tasks.</p>';
        console.error(err);
    }
}

function renderTasks(tasks) {
    const grid = document.getElementById('tasksGrid');
    if (tasks.length === 0) {
        grid.innerHTML = '<div class="empty-state"><i class="fas fa-tasks"></i><h3>No Tasks Found</h3></div>';
        return;
    }
    grid.innerHTML = tasks.map((t, idx) => `
        <div class="task-mgmt-card">
            <div class="task-card-header">
                <div class="task-card-number">Task ${idx+1}</div>
                <div class="task-card-course"><i class="fas fa-book"></i> ${t.Course_Title || 'No Course'}</div>
            </div>
            <div class="task-card-body">
                <h3 class="task-card-title"><i class="fas fa-clipboard-list"></i> ${t.Assign_Title}</h3>
                <p class="task-card-desc">${t.Assign_Desc ? t.Assign_Desc.substring(0,100)+'...' : 'No description provided.'}</p>
                <div class="task-card-stats">
                    <div class="task-stat"><i class="fas fa-question-circle"></i><span>${t.Question_Count || 0}</span><small>Questions</small></div>
                    <div class="task-stat"><i class="fas fa-star"></i><span>${t.Assign_Points || 100}</span><small>Points</small></div>
                    <div class="task-stat"><i class="fas fa-users"></i><span>${t.Submission_Count || 0}</span><small>Submitted</small></div>
                    <div class="task-stat"><i class="fas fa-calendar-alt"></i><span>${t.Assign_Due_Date ? new Date(t.Assign_Due_Date).toLocaleDateString() : 'Open'}</span><small>Due Date</small></div>
                </div>
            </div>
            <div class="task-card-actions">
                <button class="ta-btn ta-view"       onclick="viewTask(${t.Assign_ID})"><i class="fas fa-eye"></i> View & Submissions</button>
                <button class="ta-btn ta-delete"     onclick="deleteTask(${t.Assign_ID})"><i class="fas fa-trash"></i> Delete</button>
            </div>
        </div>
    `).join('');
}

function filterTasks() {
    const courseId = document.getElementById('courseFilter').value;
    loadTasks(courseId);
}

// ============================================================
// Question Management
// ============================================================
function addQuestion() {
    questionCount++;
    const questionHtml = `
        <div class="question-item" id="question_${questionCount}">
            <div class="question-header">
                <h4>Question ${questionCount}</h4>
                <button type="button" class="remove-question" onclick="removeQuestion(${questionCount})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            <div class="form-group">
                <label>Question Text</label>
                <input type="text" class="form-control" name="question_${questionCount}_text" placeholder="Enter your question" required>
            </div>
            <div class="options-container">
                <label>Answer Options (select the correct one)</label>
                <div id="options_${questionCount}">
                    <div class="option-item">
                        <input type="radio" name="correct_${questionCount}" value="0">
                        <input type="text" placeholder="Option A" class="form-control" name="option_${questionCount}_0" required>
                    </div>
                    <div class="option-item">
                        <input type="radio" name="correct_${questionCount}" value="1">
                        <input type="text" placeholder="Option B" class="form-control" name="option_${questionCount}_1" required>
                    </div>
                </div>
                <button type="button" class="add-option" onclick="addOption(${questionCount})">
                    <i class="fas fa-plus"></i> Add Option
                </button>
            </div>
        </div>
    `;
    document.getElementById('questionsList').insertAdjacentHTML('beforeend', questionHtml);
}

function addOption(questionId) {
    const optionsDiv = document.getElementById(`options_${questionId}`);
    const optionCount = optionsDiv.children.length;
    const optionHtml = `
        <div class="option-item">
            <input type="radio" name="correct_${questionId}" value="${optionCount}">
            <input type="text" placeholder="Option ${String.fromCharCode(65 + optionCount)}" class="form-control" name="option_${questionId}_${optionCount}" required>
        </div>
    `;
    optionsDiv.insertAdjacentHTML('beforeend', optionHtml);
}

function removeQuestion(questionId) {
    document.getElementById(`question_${questionId}`).remove();
}

// ============================================================
// INLINE ALERT HELPER
// ============================================================
function showTaskAlert(message, type) {
    // type: 'error' | 'warning' | 'success'
    var existing = document.getElementById('taskAlertBox');
    if (existing) existing.remove();

    var colors = {
        error:   { bg: '#fff2f2', border: '#f5c6cb', icon: 'fa-times-circle',   color: '#c0392b' },
        warning: { bg: '#fffbea', border: '#ffd97d', icon: 'fa-exclamation-triangle', color: '#b8860b' },
        success: { bg: '#f0fff4', border: '#b2dfdb', icon: 'fa-check-circle',   color: '#1a7a4a' }
    };
    var s = colors[type] || colors.error;

    var box = document.createElement('div');
    box.id = 'taskAlertBox';
    box.style.cssText = [
        'display:flex', 'align-items:flex-start', 'gap:12px',
        'background:' + s.bg,
        'border:1.5px solid ' + s.border,
        'border-radius:10px',
        'padding:14px 16px',
        'margin-bottom:18px',
        'font-size:0.88rem',
        'color:' + s.color,
        'font-family:Poppins,sans-serif',
        'animation:fadeIn 0.2s ease',
        'position:relative'
    ].join(';');

    box.innerHTML =
        '<i class="fas ' + s.icon + '" style="font-size:1.1rem;margin-top:1px;flex-shrink:0;"></i>' +
        '<span style="flex:1;line-height:1.5;">' + message + '</span>' +
        '<button onclick="this.parentElement.remove()" style="background:none;border:none;color:' + s.color + ';cursor:pointer;font-size:1rem;padding:0;margin-left:6px;flex-shrink:0;" title="Dismiss">&times;</button>';

    // Insert at top of modal body
    var modalBody = document.querySelector('#addTaskModal .modal-body');
    if (modalBody) {
        modalBody.insertBefore(box, modalBody.firstChild);
        box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // Auto-dismiss after 6 seconds
    setTimeout(function() { if (box.parentElement) box.remove(); }, 6000);
}

function clearTaskAlert() {
    var existing = document.getElementById('taskAlertBox');
    if (existing) existing.remove();
}

// ============================================================
// SAVE TASK (Create) — with full validation
// ============================================================
async function saveTask() {
    clearTaskAlert();

    const title    = document.getElementById('taskTitle').value.trim();
    const courseId = document.getElementById('taskCourseId').value;

    // ── Basic field validation ──────────────────────────────
    if (!title) {
        showTaskAlert('Please enter a <strong>Task Title</strong> before saving.', 'error');
        document.getElementById('taskTitle').focus();
        return;
    }
    if (!courseId) {
        showTaskAlert('Please <strong>select a Course</strong> before saving.', 'error');
        document.getElementById('taskCourseId').focus();
        return;
    }

    // ── Question validation ─────────────────────────────────
    const questionItems = document.querySelectorAll('#questionsList .question-item');

    if (questionItems.length === 0) {
        showTaskAlert('Please add <strong>at least one question</strong> before saving the task.', 'warning');
        return;
    }

    const questions = [];
    let validationError = null;

    for (let i = 0; i < questionItems.length; i++) {
        const item       = questionItems[i];
        const qNum       = i + 1;
        const qId        = item.id.replace('question_', '');

        // Question text must not be empty
        const textInput  = item.querySelector(`[name="question_${qId}_text"]`);
        const questionText = textInput ? textInput.value.trim() : '';
        if (!questionText) {
            validationError = 'Question <strong>#' + qNum + '</strong> is missing its question text.';
            if (textInput) textInput.focus();
            break;
        }

        // Collect all option inputs for this question
        const optionInputs = item.querySelectorAll(`[name^="option_${qId}_"]`);
        const options = [];
        let emptyOption = false;
        optionInputs.forEach(function(opt, idx) {
            const val = opt.value.trim();
            if (!val) { emptyOption = idx + 1; }
            else options.push(val);
        });

        if (emptyOption) {
            validationError = 'Question <strong>#' + qNum + '</strong> has an empty answer option. Please fill it in or remove it.';
            break;
        }

        if (options.length < 2) {
            validationError = 'Question <strong>#' + qNum + '</strong> needs at least <strong>2 answer options</strong>.';
            break;
        }

        // CORRECT ANSWER must be selected — this is the main fix
        const checkedRadio = item.querySelector(`[name="correct_${qId}"]:checked`);
        if (!checkedRadio) {
            validationError = 'Question <strong>#' + qNum + '</strong>: You must <strong>select the correct answer</strong> by clicking the radio button next to the right option.';
            // Highlight the options container
            var optContainer = item.querySelector('.options-container');
            if (optContainer) {
                optContainer.style.outline = '2px solid #c0392b';
                optContainer.style.borderRadius = '8px';
                optContainer.style.padding = '8px';
                setTimeout(function() {
                    optContainer.style.outline = '';
                    optContainer.style.padding = '';
                }, 4000);
            }
            break;
        }

        questions.push({
            text:    questionText,
            options: options,
            correct: parseInt(checkedRadio.value)
        });
    }

    if (validationError) {
        showTaskAlert(validationError, 'error');
        return;
    }

    // ── All good — submit ───────────────────────────────────
    const payload = {
        Assign_Title:    title,
        Assign_Desc:     document.getElementById('taskDescription').value.trim(),
        Assign_Points:   document.getElementById('taskPoints').value || 100,
        Assign_Due_Date: document.getElementById('taskDueDate').value || null,
        Course_ID:       courseId,
        questions:       questions
    };

    try {
        const res  = await fetch(`${API_BASE}/assignments/assignments.php?action=create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (data.success) {
            showTaskAlert('Task <strong>' + title + '</strong> created successfully!', 'success');
            setTimeout(function() {
                closeModal('addTaskModal');
                document.getElementById('courseFilter').value = courseId;
                loadTasks(courseId);
            }, 800);
        } else {
            showTaskAlert(data.message || 'Failed to save task. Please try again.', 'error');
        }
    } catch (err) {
        showTaskAlert('Server error. Please check your connection and try again.', 'error');
        console.error(err);
    }
}

// ============================================================
// VIEW TASK
// ============================================================
async function viewTask(id) {
    try {
        const [taskRes, subsRes] = await Promise.all([
            fetch(`${API_BASE}/assignments/assignments.php?action=get&id=${id}`),
            fetch(`${API_BASE}/submissions/submissions.php?action=list&assign_id=${id}`)
        ]);
        const data    = await taskRes.json();
        const subData = await subsRes.json();
        if (!data.success) { alert('Could not load task.'); return; }

        const t = data.data;
        const submissions = subData.success ? (subData.data || []) : [];

        let questionsHtml = '';
        if (t.questions && t.questions.length > 0) {
            questionsHtml = t.questions.map((q, idx) => {
                const optionsHtml = q.options ? q.options.map(o => `
                    <li style="display:flex;align-items:center;gap:8px;padding:6px 0;">
                        ${o.Is_Correct == 1
                            ? '<i class="fas fa-check-circle" style="color:#28a745;"></i><strong>' + o.Option_Text + '</strong>'
                            : '<i class="fas fa-circle" style="color:#ccc;font-size:10px;"></i>' + o.Option_Text}
                    </li>
                `).join('') : '';
                return `<div style="background:#f8f9fa;border-radius:10px;padding:15px;margin-bottom:12px;">
                    <div style="font-weight:600;color:#333;margin-bottom:8px;">Q${idx+1}: ${q.Question_Title||q.Question_Desc||''}</div>
                    <ul style="list-style:none;padding:0;margin:0;">${optionsHtml}</ul>
                </div>`;
            }).join('');
        } else {
            questionsHtml = '<p style="color:#888;">No questions added.</p>';
        }

        const subsHtml = submissions.length > 0
            ? `<div style="margin-top:20px;">
                <h4 style="margin-bottom:12px;color:#333;"><i class="fas fa-users"></i> Student Submissions (${submissions.length})</h4>
                <div style="overflow-x:auto;">
                <table style="width:100%;border-collapse:collapse;font-size:0.9rem;">
                    <thead><tr style="background:#f0f0f0;">
                        <th style="padding:10px;text-align:left;border-radius:8px 0 0 0;">Student</th>
                        <th style="padding:10px;text-align:left;">Email</th>
                        <th style="padding:10px;text-align:center;">Score</th>
                        <th style="padding:10px;text-align:center;">Status</th>
                        <th style="padding:10px;text-align:left;border-radius:0 8px 0 0;">Date</th>
                    </tr></thead>
                    <tbody>
                    ${submissions.map(s => `
                        <tr style="border-bottom:1px solid #eee;">
                            <td style="padding:10px;font-weight:500;">${s.Stu_Name}</td>
                            <td style="padding:10px;color:#666;font-size:0.85rem;">${s.Stu_Email}</td>
                            <td style="padding:10px;text-align:center;">
                                <span style="background:${(s.Subm_Score||0)>=70?'#d4edda':'#fce4e4'};color:${(s.Subm_Score||0)>=70?'#155724':'#721c24'};padding:4px 10px;border-radius:20px;font-weight:700;font-size:0.85rem;">
                                    ${s.Subm_Score !== null ? s.Subm_Score + '%' : '—'}
                                </span>
                            </td>
                            <td style="padding:10px;text-align:center;">
                                <span style="background:${s.Subm_Status==='graded'?'#cce5ff':'#fff3cd'};color:${s.Subm_Status==='graded'?'#004085':'#856404'};padding:3px 10px;border-radius:20px;font-size:0.8rem;font-weight:600;">
                                    ${s.Subm_Status||'pending'}
                                </span>
                            </td>
                            <td style="padding:10px;color:#888;font-size:0.83rem;">${s.Subm_Date ? new Date(s.Subm_Date).toLocaleDateString() : '—'}</td>
                        </tr>
                    `).join('')}
                    </tbody>
                </table></div></div>`
            : '<div style="margin-top:20px;padding:20px;background:#f8f9fa;border-radius:10px;text-align:center;color:#888;"><i class="fas fa-inbox fa-2x"></i><p style="margin-top:10px;">No submissions yet.</p></div>';

        document.getElementById('taskDetails').innerHTML = `
            <div style="margin-bottom:20px;padding-bottom:15px;border-bottom:1px solid #eee;">
                <h3 style="color:var(--primary-color);margin-bottom:8px;">${t.Assign_Title}</h3>
                <p style="color:#666;">${t.Assign_Desc || ''}</p>
                <div style="display:flex;gap:15px;margin-top:12px;flex-wrap:wrap;">
                    <span style="background:#f0e6f7;color:var(--primary-color);padding:5px 12px;border-radius:20px;font-size:0.85rem;font-weight:600;"><i class="fas fa-star"></i> ${t.Assign_Points||100} pts</span>
                    ${t.Assign_Due_Date ? '<span style="background:#fff3cd;color:#856404;padding:5px 12px;border-radius:20px;font-size:0.85rem;font-weight:600;"><i class="fas fa-calendar"></i> Due: ' + new Date(t.Assign_Due_Date).toLocaleDateString() + '</span>' : ''}
                    <span style="background:#cce5ff;color:#004085;padding:5px 12px;border-radius:20px;font-size:0.85rem;font-weight:600;"><i class="fas fa-users"></i> ${submissions.length} submitted</span>
                </div>
            </div>
            <h4 style="margin-bottom:12px;color:#333;">Questions (${t.questions ? t.questions.length : 0})</h4>
            ${questionsHtml}
            ${subsHtml}
        `;
        openModal('viewTaskModal');
    } catch (err) {
        alert('Server error.');
        console.error(err);
    }
}

// ============================================================
// DELETE TASK
// ============================================================
async function deleteTask(id) {
    if (!confirm('Are you sure you want to delete this task and all its questions?')) return;

    try {
        const res = await fetch(`${API_BASE}/assignments/assignments.php?action=delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: id })
        });
        const data = await res.json();
        alert(data.message);
        if (data.success) {
            const courseId = document.getElementById('courseFilter').value;
            loadTasks(courseId);
        }
    } catch (err) {
        alert('Server error.');
    }
}

// Logout
document.getElementById('logoutBtn').addEventListener('click', function(e) {
    e.preventDefault();
    sessionStorage.clear();
    localStorage.removeItem('currentUser');
    window.location.href = '../login/index.html';
});

// On page load
window.addEventListener('load', function() {
    loadCourseDropdowns().then(() => loadTasks(''));
});