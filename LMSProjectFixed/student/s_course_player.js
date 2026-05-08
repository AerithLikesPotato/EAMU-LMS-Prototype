// ============================================================
// s_course_player.js  — proper video-end tracking
//
// Rules:
//  • Counter shows COMPLETED lessons (0/N on first open)
//  • Video must reach THE END to be marked complete
//  • YouTube: uses IFrame API onStateChange ENDED(0)
//  • HTML5:   uses <video> 'ended' event
//  • After last lesson/task done → 100% → certificate modal
// ============================================================
const PLAYER_API = '../lms_backend/lms_backend/api';

let courseData         = null;
let lessons            = [];
let tasks              = [];
let currentLessonIndex = 0;
let progressMap        = {}; // lesson_id (string) -> 'not_started'|'in_progress'|'completed'
let submittedTasks     = {}; // assign_id (string) -> submission object
var _courseCompletionTriggered = false;

var _ytPlayer        = null;
var _ytReady         = false;
var _ytTargetVideoId = null;

const playerParams = new URLSearchParams(window.location.search);
const courseId     = playerParams.get('id');

// ============================================================
// YOUTUBE IFRAME API  (must be global window function)
// ============================================================
window.onYouTubeIframeAPIReady = function () {
    _ytReady = true;
    if (_ytTargetVideoId) {
        _createYTPlayer(_ytTargetVideoId);
        _ytTargetVideoId = null;
    }
};

function _loadYTApi() {
    if (window.YT && window.YT.Player) { _ytReady = true; return; }
    if (document.getElementById('yt-iframe-api')) return;
    var s   = document.createElement('script');
    s.id    = 'yt-iframe-api';
    s.src   = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(s);
}

function _createYTPlayer(videoId) {
    if (_ytPlayer && typeof _ytPlayer.destroy === 'function') {
        try { _ytPlayer.destroy(); } catch (e) {}
        _ytPlayer = null;
    }
    if (!document.getElementById('ytEmbedTarget')) return;
    _ytPlayer = new YT.Player('ytEmbedTarget', {
        videoId:    videoId,
        playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
        events: {
            onStateChange: function (e) {
                var lesson = lessons[currentLessonIndex];
                if (!lesson) return;
                var lid = String(lesson.Lesson_ID);
                if (e.data === YT.PlayerState.PLAYING && progressMap[lid] !== 'completed') {
                    _setInProgress(lid);
                }
                if (e.data === YT.PlayerState.ENDED) {
                    _onVideoEnded();
                }
            }
        }
    });
}

function _setInProgress(lid) {
    if (progressMap[lid] === 'in_progress' || progressMap[lid] === 'completed') return;
    progressMap[lid] = 'in_progress';
    _refreshBadgeAndPlaylist(lid);
    // persist to backend async (fire-and-forget)
    _saveProgress(lessons[currentLessonIndex].Lesson_ID, 'in_progress');
}

function _onVideoEnded() {
    var lesson = lessons[currentLessonIndex];
    if (!lesson) return;
    var lid = String(lesson.Lesson_ID);
    if (progressMap[lid] === 'completed') return;
    _markLessonComplete(lid);
}

// ============================================================
// INIT
// ============================================================
window.addEventListener('load', async function () {
    var currentUser = checkAuth();
    if (!currentUser) return;

    _loadYTApi();

    if (!courseId) {
        document.getElementById('playerContainer').innerHTML =
            '<div style="text-align:center;padding:60px;"><h3>No course selected</h3><a href="s_active_courses.html">Back</a></div>';
        return;
    }

    try {
        var [courseRes, tasksRes, progressRes, submissionsRes] = await Promise.all([
            fetch(PLAYER_API + '/courses/courses.php?action=get&id=' + courseId),
            fetch(PLAYER_API + '/assignments/assignments.php?action=list&course_id=' + courseId),
            fetch(PLAYER_API + '/progress/progress.php?action=get&stu_id=' + currentUser.id + '&course_id=' + courseId),
            fetch(PLAYER_API + '/submissions/submissions.php?action=mine&stu_id=' + currentUser.id)
        ]);

        var courseJson      = await courseRes.json();
        var tasksJson       = await tasksRes.json();
        var progressJson    = await progressRes.json();
        var submissionsJson = await submissionsRes.json();

        if (!courseJson.success) {
            document.getElementById('playerContainer').innerHTML =
                '<div style="text-align:center;padding:60px;"><h3>Course not found</h3></div>';
            return;
        }

        courseData = courseJson.data;
        lessons    = courseData.lessons || [];
        tasks      = tasksJson.data     || [];

        // Build progress map
        progressMap = {};
        if (progressJson.success && progressJson.data && progressJson.data.lessons) {
            progressJson.data.lessons.forEach(function (l) {
                progressMap[String(l.Lesson_ID)] = l.Status || 'not_started';
            });
        }

        // Build submitted tasks map
        submittedTasks = {};
        if (submissionsJson.success && submissionsJson.data) {
            submissionsJson.data.forEach(function (s) {
                submittedTasks[String(s.Assign_ID)] = s;
            });
        }

        // Resume at first incomplete lesson
        currentLessonIndex = 0;
        for (var i = 0; i < lessons.length; i++) {
            if (progressMap[String(lessons[i].Lesson_ID)] !== 'completed') {
                currentLessonIndex = i;
                break;
            }
        }

        // If all lessons completed, stay on last
        if (lessons.every(function (l) { return progressMap[String(l.Lesson_ID)] === 'completed'; }) && lessons.length > 0) {
            currentLessonIndex = lessons.length - 1;
        }

        renderPlayer();

        // Suppress completion re-trigger if already done
        var initDone = countCompletedLessons() + countCompletedTasks();
        if ((lessons.length + tasks.length) > 0 && initDone >= (lessons.length + tasks.length)) {
            _courseCompletionTriggered = true;
        }

        // Mark current lesson in_progress if not yet started
        if (lessons.length > 0) {
            var cid = String(lessons[currentLessonIndex].Lesson_ID);
            if (!progressMap[cid] || progressMap[cid] === 'not_started') {
                progressMap[cid] = 'in_progress';
                _saveProgress(lessons[currentLessonIndex].Lesson_ID, 'in_progress');
            }
        }

    } catch (err) {
        console.error('Course load error:', err);
        document.getElementById('playerContainer').innerHTML =
            '<div style="text-align:center;padding:60px;"><h3>Error loading course</h3><p>Make sure the server is running.</p></div>';
    }
});

// ============================================================
// RENDER PLAYER  (full layout, then loads video separately)
// ============================================================
function renderPlayer() {
    var totalLessons     = lessons.length;
    var totalTasks       = tasks.length;
    var completedLessons = countCompletedLessons();
    var completedTasks   = countCompletedTasks();
    var totalItems       = totalLessons + totalTasks;
    var completedItems   = completedLessons + completedTasks;
    var overallPct       = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
    var lesson           = lessons[currentLessonIndex] || null;
    var lid              = lesson ? String(lesson.Lesson_ID) : null;
    var isDone           = lid && progressMap[lid] === 'completed';

    document.getElementById('playerContainer').innerHTML =
        // ── HEADER ──────────────────────────────────────────────
        '<div class="course-header">' +
            '<h1>' + (courseData.Course_Title || '') + '</h1>' +
            '<div class="instructor-info"><i class="fas fa-user-tie"></i><span>' + (courseData.Lec_Name || 'Instructor') + '</span></div>' +
            '<div class="progress-summary">' +
                '<div class="progress-summary-item"><i class="fas fa-play-circle"></i><div>' +
                    '<div class="label">Lessons Done</div>' +
                    '<div class="value" id="summaryLessons">' + completedLessons + '/' + totalLessons + '</div>' +
                '</div></div>' +
                '<div class="progress-summary-item"><i class="fas fa-tasks"></i><div>' +
                    '<div class="label">Tasks Done</div>' +
                    '<div class="value" id="summaryTasks">' + completedTasks + '/' + totalTasks + '</div>' +
                '</div></div>' +
                '<div class="progress-summary-item"><i class="fas fa-chart-line"></i><div>' +
                    '<div class="label">Overall Progress</div>' +
                    '<div class="value" id="overallPctText">' + overallPct + '%</div>' +
                '</div></div>' +
            '</div>' +
            '<div style="margin-top:14px;">' +
                '<div style="display:flex;justify-content:space-between;font-size:0.85rem;color:var(--gray);margin-bottom:6px;">' +
                    '<span>Overall Progress</span><span id="overallPctLabel">' + overallPct + '%</span>' +
                '</div>' +
                '<div style="background:#eef2f6;border-radius:20px;height:12px;">' +
                    '<div id="overallProgressBar" style="width:' + overallPct + '%;background:linear-gradient(90deg,var(--primary-color),var(--secondary-color));border-radius:20px;height:12px;transition:width 0.7s ease;"></div>' +
                '</div>' +
            '</div>' +
        '</div>' +

        // ── GRID ────────────────────────────────────────────────
        '<div class="player-grid">' +

            // Video + controls
            '<div class="video-section">' +
                '<div class="video-player" id="videoPlayer"></div>' +
                '<div class="video-controls">' +
                    '<div class="lesson-info">' +
                        '<span class="lesson-title" id="lessonTitle">' + (lesson ? lesson.Lesson_Title : 'No lessons') + '</span>' +
                        '<span class="lesson-badge" id="lessonDuration">' + (lesson ? (lesson.Lesson_Duration || 'N/A') : '--') + '</span>' +
                    '</div>' +

                    // Lessons Done bar — shows COMPLETED count
                    '<div class="progress-section">' +
                        '<div class="progress-label">' +
                            '<span>Lessons Done</span>' +
                            '<span id="lessonProgress">' + completedLessons + '/' + totalLessons + '</span>' +
                        '</div>' +
                        '<div class="progress-bar"><div class="progress-fill" id="lessonProgressBar" style="width:' +
                            (totalLessons > 0 ? Math.round(completedLessons / totalLessons * 100) : 0) + '%;"></div></div>' +
                    '</div>' +

                    '<div style="margin-top:12px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;">' +
                        '<span id="lessonStatusBadge" class="lesson-status-badge ' + _statusClass(lid) + '">' + _statusText(lid) + '</span>' +
                        '<button id="markCompleteBtn" class="btn-mark-complete" onclick="markCurrentComplete()"' +
                            (isDone ? ' disabled style="opacity:0.6;"' : '') + '>' +
                            '<i class="fas fa-check"></i> ' + (isDone ? 'Completed!' : 'Mark as Complete') +
                        '</button>' +
                    '</div>' +

                    '<div class="nav-buttons">' +
                        '<button class="nav-btn nav-btn-prev" id="prevBtn" onclick="navigateLesson(-1)"' + (currentLessonIndex === 0 ? ' disabled' : '') + '>' +
                            '<i class="fas fa-arrow-left"></i> Previous' +
                        '</button>' +
                        '<button class="nav-btn nav-btn-next" id="nextBtn" onclick="navigateLesson(1)"' + (currentLessonIndex >= totalLessons - 1 ? ' disabled' : '') + '>' +
                            'Next <i class="fas fa-arrow-right"></i>' +
                        '</button>' +
                    '</div>' +
                '</div>' +

                // Playlist
                '<div style="border-top:1px solid #eef2f6;padding:20px;">' +
                    '<h4 style="margin-bottom:15px;color:var(--dark-color);font-size:1rem;">' +
                        '<i class="fas fa-list" style="color:var(--primary-color);margin-right:8px;"></i>' +
                        'Course Lessons (' + totalLessons + ')' +
                    '</h4>' +
                    '<div id="lessonPlaylist">' + _renderPlaylist() + '</div>' +
                '</div>' +
            '</div>' +

            // Tasks sidebar
            '<div class="tasks-sidebar">' +
                '<div class="sidebar-header">' +
                    '<h3><i class="fas fa-tasks"></i> Course Tasks</h3>' +
                    '<p>' + totalTasks + ' task' + (totalTasks !== 1 ? 's' : '') + '</p>' +
                '</div>' +
                '<div class="tasks-list" id="tasksList">' + _renderTasks() + '</div>' +
            '</div>' +

        '</div>';

    // Load video after DOM is rendered
    _loadVideoForLesson(lesson);
}

// ============================================================
// VIDEO LOADER
// ============================================================
function _loadVideoForLesson(lesson) {
    var container = document.getElementById('videoPlayer');
    if (!container) return;

    if (!lesson || !lesson.Lesson_Video_URL) {
        container.innerHTML =
            '<div class="video-placeholder"><i class="fas fa-play-circle"></i>' +
            '<p>' + (lesson ? 'No video for this lesson' : 'No lessons yet') + '</p></div>';
        return;
    }

    var url     = lesson.Lesson_Video_URL;
    var ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);

    if (ytMatch) {
        // YouTube — use IFrame API so we can catch the ENDED event
        container.innerHTML = '<div id="ytEmbedTarget" style="width:100%;height:100%;"></div>';
        if (_ytReady) {
            _createYTPlayer(ytMatch[1]);
        } else {
            _ytTargetVideoId = ytMatch[1];
            _loadYTApi();
        }
    } else if (url.match(/\.(mp4|webm|ogg)$/i)) {
        container.innerHTML = '<video id="html5Video" controls style="width:100%;height:100%;background:#000;">' +
            '<source src="' + url + '"></video>';
        var vid = document.getElementById('html5Video');
        if (vid) {
            vid.addEventListener('play', function () {
                var lid = lessons[currentLessonIndex] ? String(lessons[currentLessonIndex].Lesson_ID) : null;
                if (lid) _setInProgress(lid);
            });
            vid.addEventListener('ended', function () { _onVideoEnded(); });
        }
    } else {
        container.innerHTML =
            '<div class="video-placeholder" style="flex-direction:column;gap:12px;">' +
            '<i class="fas fa-external-link-alt" style="font-size:3rem;opacity:0.5;"></i>' +
            '<p>Video link provided</p>' +
            '<a href="' + url + '" target="_blank" style="color:white;background:rgba(255,255,255,0.2);padding:10px 20px;border-radius:8px;text-decoration:none;">Open Video</a>' +
            '</div>';
    }
}

// ============================================================
// MARK LESSON COMPLETE  (after video ends or manual button)
// ============================================================
async function _markLessonComplete(lid) {
    if (progressMap[lid] === 'completed') return;

    var currentUser = checkAuth();
    if (!currentUser) return;

    progressMap[lid] = 'completed';

    // Update UI instantly
    _refreshBadgeAndPlaylist(lid);
    _updateLessonCounter();
    _updateOverallBar();

    var btn = document.getElementById('markCompleteBtn');
    if (btn) { btn.innerHTML = '<i class="fas fa-check"></i> Completed!'; btn.style.opacity = '0.6'; btn.disabled = true; }

    // Persist to backend
    try {
        var res  = await _saveProgress(lessons[currentLessonIndex] ? lessons[currentLessonIndex].Lesson_ID : lid, 'completed');
        var data = await res.json();
        var allLessons = data.data && data.data.lessons_done;
        var allTasks   = tasks.length === 0 || countCompletedTasks() >= tasks.length;
        if (allLessons && allTasks) {
            await _generateCertificate(currentUser);
        } else if (allLessons) {
            _showBanner('All lessons complete! Finish ' + (tasks.length - countCompletedTasks()) + ' remaining task(s) for your certificate.');
        }
    } catch (e) { console.error('markComplete error:', e); }
}

// Button handler
async function markCurrentComplete() {
    var lesson = lessons[currentLessonIndex];
    if (!lesson) return;
    var lid = String(lesson.Lesson_ID);
    if (progressMap[lid] === 'completed') return;

    var btn = document.getElementById('markCompleteBtn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...'; }

    await _markLessonComplete(lid);
}

// ============================================================
// SAVE PROGRESS TO BACKEND
// ============================================================
function _saveProgress(lessonId, status) {
    var currentUser = checkAuth();
    if (!currentUser) return Promise.resolve({ json: function(){ return {}; } });
    return fetch(PLAYER_API + '/progress/progress.php?action=update', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ Stu_ID: currentUser.id, Lesson_ID: lessonId, Course_ID: courseId, Status: status })
    });
}

// ============================================================
// UI HELPERS
// ============================================================
function _statusClass(lid) {
    if (!lid) return 'status-not-started';
    var s = progressMap[lid];
    if (s === 'completed')   return 'status-completed';
    if (s === 'in_progress') return 'status-in-progress';
    return 'status-not-started';
}
function _statusText(lid) {
    if (!lid) return '<i class="fas fa-circle"></i> Not Started';
    var s = progressMap[lid];
    if (s === 'completed')   return '<i class="fas fa-check-circle"></i> Completed';
    if (s === 'in_progress') return '<i class="fas fa-play-circle"></i> Watching...';
    return '<i class="fas fa-circle"></i> Not Started';
}

function _refreshBadgeAndPlaylist(lid) {
    var badge = document.getElementById('lessonStatusBadge');
    if (badge) { badge.className = 'lesson-status-badge ' + _statusClass(lid); badge.innerHTML = _statusText(lid); }
    var pl = document.getElementById('lessonPlaylist');
    if (pl) pl.innerHTML = _renderPlaylist();
}

function _updateLessonCounter() {
    var total     = lessons.length;
    var completed = countCompletedLessons();
    var el  = document.getElementById('lessonProgress');
    var bar = document.getElementById('lessonProgressBar');
    if (el)  el.textContent  = completed + '/' + total;
    if (bar) bar.style.width = total > 0 ? Math.round(completed / total * 100) + '%' : '0%';
    var sumL = document.getElementById('summaryLessons');
    if (sumL) sumL.textContent = completed + '/' + total;
}

function _updateOverallBar() {
    var cl   = countCompletedLessons();
    var ct   = countCompletedTasks();
    var tot  = lessons.length + tasks.length;
    var pct  = tot > 0 ? Math.round((cl + ct) / tot * 100) : 0;

    var bar   = document.getElementById('overallProgressBar');
    var label = document.getElementById('overallPctLabel');
    var text  = document.getElementById('overallPctText');
    var sumT  = document.getElementById('summaryTasks');
    if (bar)   bar.style.width   = pct + '%';
    if (label) label.textContent = pct + '%';
    if (text)  text.textContent  = pct + '%';
    if (sumT)  sumT.textContent  = ct + '/' + tasks.length;

    // 100% → trigger completion (once)
    if (pct === 100 && tot > 0 && !_courseCompletionTriggered) {
        _courseCompletionTriggered = true;
        var u = checkAuth();
        if (u) setTimeout(function() { _generateCertificate(u); }, 700);
    }
}

function countCompletedLessons() {
    return lessons.filter(function (l) { return progressMap[String(l.Lesson_ID)] === 'completed'; }).length;
}
function countCompletedTasks() {
    return tasks.filter(function (t) { return !!submittedTasks[String(t.Assign_ID)]; }).length;
}

// ============================================================
// LESSON PLAYLIST
// ============================================================
function _renderPlaylist() {
    if (!lessons.length) return '<p style="color:var(--gray);font-size:0.9rem;">No lessons yet.</p>';
    return lessons.map(function (l, idx) {
        var id       = String(l.Lesson_ID);
        var status   = progressMap[id] || 'not_started';
        var isActive = idx === currentLessonIndex;
        var title    = l.Lesson_Title || ('Lesson ' + (idx + 1));
        var short    = title.length > 50 ? title.slice(0, 50) + '…' : title;
        var dur      = l.Lesson_Duration || '';

        var icon, border, bg;
        if (status === 'completed') {
            icon   = '<div style="min-width:28px;width:28px;height:28px;border-radius:50%;background:#28a745;display:flex;align-items:center;justify-content:center;"><i class="fas fa-check" style="color:#fff;font-size:0.65rem;"></i></div>';
            border = '#28a745'; bg = isActive ? '#e8f5e9' : '#f6fdf6';
        } else if (isActive) {
            icon   = '<div style="min-width:28px;width:28px;height:28px;border-radius:50%;background:var(--primary-color);display:flex;align-items:center;justify-content:center;"><i class="fas fa-play" style="color:#fff;font-size:0.65rem;"></i></div>';
            border = 'var(--primary-color)'; bg = '#f3e8f3';
        } else {
            icon   = '<div style="min-width:28px;width:28px;height:28px;border-radius:50%;background:#eef2f6;display:flex;align-items:center;justify-content:center;color:#999;font-size:0.78rem;font-weight:600;">' + (idx + 1) + '</div>';
            border = 'transparent'; bg = '#f8f9fa';
        }

        return '<div onclick="goToLesson(' + idx + ')" title="' + title + '" ' +
            'style="background:' + bg + ';border-left:3px solid ' + border + ';border-radius:8px;padding:10px 12px;margin-bottom:8px;cursor:pointer;display:flex;align-items:center;gap:10px;" ' +
            'onmouseover="this.style.opacity=\'0.8\'" onmouseout="this.style.opacity=\'1\'">' +
            icon +
            '<div style="flex:1;min-width:0;">' +
                '<div style="font-size:0.87rem;font-weight:' + (isActive ? '600' : '500') + ';color:' + (isActive ? 'var(--primary-color)' : 'var(--dark-color)') + ';overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + short + '</div>' +
                (dur ? '<div style="font-size:0.74rem;color:var(--gray);margin-top:2px;"><i class="fas fa-clock" style="font-size:0.7rem;margin-right:3px;"></i>' + dur + '</div>' : '') +
            '</div>' +
        '</div>';
    }).join('');
}

// ============================================================
// LESSON NAVIGATION
// ============================================================
function goToLesson(index) {
    if (index < 0 || index >= lessons.length || index === currentLessonIndex) return;

    // Save current as in_progress if not completed
    var cur = lessons[currentLessonIndex];
    if (cur && progressMap[String(cur.Lesson_ID)] !== 'completed') {
        _saveProgress(cur.Lesson_ID, 'in_progress');
    }

    // Destroy old YT player
    if (_ytPlayer && typeof _ytPlayer.destroy === 'function') {
        try { _ytPlayer.destroy(); } catch (e) {}
        _ytPlayer = null;
    }

    currentLessonIndex = index;
    var lesson = lessons[index];
    var lid    = lesson ? String(lesson.Lesson_ID) : null;
    var isDone = lid && progressMap[lid] === 'completed';

    // Update controls
    var titleEl = document.getElementById('lessonTitle');
    var durEl   = document.getElementById('lessonDuration');
    var badge   = document.getElementById('lessonStatusBadge');
    var btn     = document.getElementById('markCompleteBtn');
    var prev    = document.getElementById('prevBtn');
    var next    = document.getElementById('nextBtn');

    if (titleEl) titleEl.textContent = lesson ? lesson.Lesson_Title : '';
    if (durEl)   durEl.textContent   = lesson ? (lesson.Lesson_Duration || 'N/A') : '--';
    if (badge)   { badge.className = 'lesson-status-badge ' + _statusClass(lid); badge.innerHTML = _statusText(lid); }
    if (btn)     { btn.disabled = isDone; btn.style.opacity = isDone ? '0.6' : '1'; btn.innerHTML = '<i class="fas fa-check"></i> ' + (isDone ? 'Completed!' : 'Mark as Complete'); }
    if (prev)    prev.disabled = index === 0;
    if (next)    next.disabled = index >= lessons.length - 1;

    var pl = document.getElementById('lessonPlaylist');
    if (pl) pl.innerHTML = _renderPlaylist();

    _updateLessonCounter();
    _loadVideoForLesson(lesson);

    // Mark new lesson in_progress if untouched
    if (lid && (!progressMap[lid] || progressMap[lid] === 'not_started')) {
        progressMap[lid] = 'in_progress';
        _saveProgress(lesson.Lesson_ID, 'in_progress');
    }
}

function navigateLesson(dir) { goToLesson(currentLessonIndex + dir); }

// ============================================================
// TASKS LIST
// ============================================================
function _renderTasks() {
    if (!tasks.length) return '<div style="padding:20px;text-align:center;color:var(--gray);"><i class="fas fa-clipboard-check fa-2x"></i><p style="margin-top:10px;">No tasks for this course.</p></div>';
    return tasks.map(function (t, idx) {
        var sub   = submittedTasks[String(t.Assign_ID)];
        var done  = !!sub;
        var desc  = t.Assign_Desc || '';
        var short = desc.length > 85 ? desc.slice(0, 85) + '…' : (desc || 'No description');
        return '<div class="task-item ' + (done ? 'task-submitted' : 'task-pending') + '">' +
            '<div class="task-header"><span class="task-number">Task ' + (idx + 1) + '</span>' +
            (done ? '<span style="color:#28a745;font-size:0.8rem;font-weight:600;"><i class="fas fa-check-circle"></i> Submitted</span>' : '') +
            '</div>' +
            '<div class="task-title">' + t.Assign_Title + '</div>' +
            '<div class="task-description" title="' + (t.Assign_Desc || '') + '">' + short + '</div>' +
            '<div class="task-meta">' +
            (t.Assign_Due_Date ? '<span><i class="fas fa-calendar"></i> ' + new Date(t.Assign_Due_Date).toLocaleDateString() + '</span>' : '') +
            '<span><i class="fas fa-question-circle"></i> ' + (t.Question_Count || 0) + ' Qs</span>' +
            '<span><i class="fas fa-star"></i> ' + (t.Assign_Points || 100) + ' pts</span>' +
            '</div>' +
            (done
                ? '<div style="margin-top:10px;padding:10px;background:#d4edda;border-radius:10px;font-size:0.85rem;color:#155724;text-align:center;">' +
                  '<i class="fas fa-check-circle"></i> Score: <strong>' + (sub.Subm_Score != null ? sub.Subm_Score + '%' : 'Pending review') + '</strong></div>'
                : '<div class="task-status status-pending"><i class="fas fa-clock"></i> Pending</div>' +
                  '<a href="#" class="btn-start-task" onclick="openTask(' + t.Assign_ID + '); return false;">' +
                  '<i class="fas fa-play-circle"></i> Start Task</a>'
            ) + '</div>';
    }).join('');
}

// ============================================================
// TASK MODAL
// ============================================================
async function openTask(assignId) {
    var modal   = document.getElementById('taskModal');
    var titleEl = document.getElementById('taskModalTitle');
    var bodyEl  = document.getElementById('taskModalBody');
    if (!modal) return;
    if (titleEl) titleEl.textContent = 'Loading...';
    if (bodyEl)  bodyEl.innerHTML = '<div style="text-align:center;padding:40px;"><i class="fas fa-spinner fa-spin fa-2x"></i></div>';
    modal.classList.add('active');

    try {
        var res  = await fetch(PLAYER_API + '/assignments/assignments.php?action=get&id=' + assignId);
        var data = await res.json();
        if (!data.success) { if (bodyEl) bodyEl.innerHTML = '<p style="color:red;padding:20px;">Could not load task.</p>'; return; }

        var t = data.data; var questions = t.questions || [];
        if (titleEl) titleEl.textContent = t.Assign_Title;

        var html = '<div style="margin-bottom:20px;padding-bottom:15px;border-bottom:1px solid #eee;">' +
            (t.Assign_Desc ? '<p style="color:#666;">' + t.Assign_Desc + '</p>' : '') +
            (t.Assign_Due_Date ? '<p style="background:#fff3cd;color:#856404;padding:10px;border-radius:8px;margin-top:10px;font-size:0.9rem;"><i class="fas fa-calendar-alt"></i> Due: ' + new Date(t.Assign_Due_Date).toLocaleDateString() + '</p>' : '') +
            '<p style="margin-top:10px;font-size:0.9rem;"><strong>Points:</strong> ' + (t.Assign_Points || 100) + '</p></div>';

        if (!questions.length) {
            html += '<p style="color:#888;text-align:center;padding:20px;">No questions yet.</p>';
        } else {
            questions.forEach(function (q, idx) {
                html += '<div class="question-item"><div class="question-text">' + (idx + 1) + '. ' + (q.Question_Title || q.Question_Desc || 'Question') + '</div>';
                if (q.options && q.options.length) {
                    q.options.forEach(function (o) {
                        html += '<label style="display:flex;align-items:center;gap:10px;padding:10px 14px;margin:6px 0;background:white;border-radius:10px;cursor:pointer;border:2px solid #eef2f6;">' +
                            '<input type="radio" name="answer_' + q.Question_ID + '" value="' + o.Option_ID + '" style="margin:0;accent-color:var(--primary-color);">' +
                            '<span>' + o.Option_Text + '</span></label>';
                    });
                } else {
                    html += '<textarea class="answer-textarea" placeholder="Type your answer..." name="answer_' + q.Question_ID + '"></textarea>';
                }
                html += '</div>';
            });
            html += '<button id="submitTaskBtn" onclick="submitTask(' + assignId + ')" style="width:100%;padding:14px;background:var(--primary-color);color:white;border:none;border-radius:12px;font-size:1rem;font-weight:600;cursor:pointer;margin-top:10px;"><i class="fas fa-paper-plane"></i> Submit Task</button>';
        }
        if (bodyEl) bodyEl.innerHTML = html;
    } catch (err) {
        if (bodyEl) bodyEl.innerHTML = '<p style="color:red;padding:20px;">Server error.</p>';
    }
}

function closeTaskModal() {
    var m = document.getElementById('taskModal');
    if (m) m.classList.remove('active');
}

// ============================================================
// SUBMIT TASK
// ============================================================
async function submitTask(assignId) {
    var currentUser = checkAuth();
    if (!currentUser) return;
    var btn = document.getElementById('submitTaskBtn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...'; }

    try {
        var res   = await fetch(PLAYER_API + '/assignments/assignments.php?action=get&id=' + assignId);
        var data  = await res.json();
        if (!data.success) { alert('Error loading task.'); return; }

        var questions = data.data.questions || [];
        var answers   = [];
        for (var i = 0; i < questions.length; i++) {
            var q = questions[i];
            if (q.options && q.options.length) {
                var sel = document.querySelector('input[name="answer_' + q.Question_ID + '"]:checked');
                answers.push({ Question_ID: q.Question_ID, Option_ID: sel ? sel.value : null });
            } else {
                var ta = document.querySelector('textarea[name="answer_' + q.Question_ID + '"]');
                answers.push({ Question_ID: q.Question_ID, Answer_Text: ta ? ta.value : '' });
            }
        }

        var sRes  = await fetch(PLAYER_API + '/submissions/submissions.php?action=submit', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ Assign_ID: assignId, Stu_ID: currentUser.id, answers: answers })
        });
        var sData = await sRes.json();

        if (sData.success) {
            submittedTasks[String(assignId)] = { Assign_ID: String(assignId), Subm_Score: sData.data ? sData.data.score : null };
            var sd = sData.data;
            var bodyEl = document.getElementById('taskModalBody');
            if (bodyEl) bodyEl.innerHTML =
                '<div style="text-align:center;padding:40px 20px;">' +
                '<div style="width:80px;height:80px;background:#d4edda;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;"><i class="fas fa-check" style="font-size:2rem;color:#28a745;"></i></div>' +
                '<h3 style="color:#28a745;margin-bottom:10px;">Task Submitted!</h3>' +
                (sd ? '<p style="font-size:1.3rem;font-weight:700;color:#333;">Score: ' + sd.score + '%</p><p style="color:#666;margin-top:5px;">Correct: ' + sd.correct + ' / ' + sd.total + ' points</p>' : '') +
                '<button onclick="closeTaskModal()" style="margin-top:25px;padding:12px 35px;background:var(--primary-color);color:white;border:none;border-radius:12px;cursor:pointer;font-size:1rem;font-weight:600;">Done</button></div>';

            var tl = document.getElementById('tasksList');
            if (tl) tl.innerHTML = _renderTasks();

            _updateOverallBar();

            var allL = lessons.every(function (l) { return progressMap[String(l.Lesson_ID)] === 'completed'; });
            var allT = tasks.length === 0 || countCompletedTasks() >= tasks.length;
            if (allL && allT) {
                setTimeout(function () { closeTaskModal(); _generateCertificate(currentUser); }, 1800);
            }
        } else {
            alert(sData.message || 'Submission failed.');
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Task'; }
        }
    } catch (err) {
        alert('Server error.');
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Task'; }
    }
}

// ============================================================
// CERTIFICATE + COMPLETION MODAL
// ============================================================
async function _generateCertificate(currentUser) {
    try {
        var r = await fetch(PLAYER_API + '/certificates/certificates.php?action=auto_generate', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ Stu_ID: currentUser.id, Course_ID: courseId })
        });
        var d = await r.json();
        _showCompletionModal(d.success ? d.data.Cert_Code : null, d.success ? d.data.Cert_ID : null);
    } catch (e) { _showCompletionModal(null, null); }
}

function _showBanner(msg) {
    var b = document.getElementById('infoBanner');
    if (!b) {
        b = document.createElement('div');
        b.id = 'infoBanner';
        b.style.cssText = 'position:fixed;top:80px;left:50%;transform:translateX(-50%);background:#fff3cd;color:#856404;border:1px solid #ffc107;padding:14px 24px;border-radius:12px;font-weight:600;z-index:9998;box-shadow:0 4px 20px rgba(0,0,0,.15);max-width:90vw;text-align:center;';
        document.body.appendChild(b);
    }
    b.textContent = msg; b.style.display = 'block';
    setTimeout(function () { b.style.display = 'none'; }, 7000);
}

function _showCompletionModal(certCode, certId) {
    var old = document.getElementById('completionOverlay');
    if (old) old.remove();
    var o = document.createElement('div');
    o.id  = 'completionOverlay';
    o.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.65);z-index:10000;display:flex;align-items:center;justify-content:center;';
    o.innerHTML =
        '<div style="background:#fff;border-radius:20px;padding:50px 40px;max-width:500px;width:90%;text-align:center;animation:popIn .4s ease;">' +
        '<style>@keyframes popIn{from{transform:scale(.7);opacity:0}to{transform:scale(1);opacity:1}}</style>' +
        '<div style="width:100px;height:100px;background:linear-gradient(135deg,#9b4399,#761176);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 25px;">' +
        '<i class="fas fa-graduation-cap" style="font-size:2.5rem;color:#fff;"></i></div>' +
        '<h2 style="color:#9b4399;font-size:1.8rem;margin-bottom:10px;">&#127881; Course Completed!</h2>' +
        '<p style="color:#555;font-size:1.05rem;margin-bottom:15px;">Congratulations! You successfully completed<br><strong>' + (courseData ? courseData.Course_Title : 'this course') + '</strong></p>' +
        (certCode ? '<div style="background:#f0e8f0;border-radius:10px;padding:12px;margin-bottom:20px;font-size:0.9rem;color:#761176;"><i class="fas fa-certificate"></i> <strong>Certificate ID:</strong> ' + certCode + '</div>' : '') +
        '<div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center;margin-top:20px;">' +
        (certId ? '<a href="s_certificate.html?id=' + certId + '" style="background:#9b4399;color:#fff;padding:12px 24px;border-radius:12px;text-decoration:none;font-weight:600;"><i class="fas fa-certificate"></i> View Certificate</a>' : '') +
        '<a href="s_completed_courses.html" style="background:#28a745;color:#fff;padding:12px 24px;border-radius:12px;text-decoration:none;font-weight:600;"><i class="fas fa-clipboard-check"></i> Completed Courses</a>' +
        '</div></div>';
    document.body.appendChild(o);
    o.addEventListener('click', function (e) { if (e.target === o) o.remove(); });
}

window.addEventListener('click', function (e) {
    var m = document.getElementById('taskModal');
    if (m && e.target === m) closeTaskModal();
});
