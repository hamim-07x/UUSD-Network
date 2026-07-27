const fs = require('fs');
const file = 'src/pages/AdminPanel.tsx';
let content = fs.readFileSync(file, 'utf8');

// Add taskFilter state
content = content.replace(
  'const [isAddingTask, setIsAddingTask] = useState(false);',
  'const [isAddingTask, setIsAddingTask] = useState(false);\n  const [taskFilter, setTaskFilter] = useState("all");'
);

// Add task filter buttons
const tasksSectionOriginal = `{activeTab === "tasks" && (
              <motion.div key="tasks" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">Tasks</h2>
                    <p className="text-white/40 text-sm">Manage reward tasks</p>
                  </div>
                  <button onClick={() => { setIsAddingTask(!isAddingTask); setEditingTaskId(null); }}
                    className="flex items-center gap-2 bg-gradient-to-r from-[#8792FF] to-[#6b76e3] text-white text-sm font-bold px-4 py-2.5 rounded-xl">
                    {isAddingTask ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    {isAddingTask ? "Cancel" : "Add Task"}
                  </button>
                </div>`;

const tasksSectionReplacement = `{activeTab === "tasks" && (
              <motion.div key="tasks" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">Tasks</h2>
                    <p className="text-white/40 text-sm">Manage reward tasks</p>
                  </div>
                  <button onClick={() => { setIsAddingTask(!isAddingTask); setEditingTaskId(null); }}
                    className="flex items-center gap-2 bg-gradient-to-r from-[#8792FF] to-[#6b76e3] text-white text-sm font-bold px-4 py-2.5 rounded-xl">
                    {isAddingTask ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    {isAddingTask ? "Cancel" : "Add Task"}
                  </button>
                </div>

                <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-none">
                  <button onClick={() => setTaskFilter("all")} className={\`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors \${taskFilter === "all" ? "bg-[#8792FF] text-white" : "bg-white/5 text-white/50 hover:bg-white/10"}\`}>
                    All Tasks ({tasks.length})
                  </button>
                  {events.map(ev => {
                    const count = tasks.filter(t => t.eventId === ev.id).length;
                    return (
                      <button key={ev.id} onClick={() => setTaskFilter(ev.id)} className={\`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors \${taskFilter === ev.id ? "bg-[#8792FF] text-white" : "bg-white/5 text-white/50 hover:bg-white/10"}\`}>
                        {ev.title} ({count})
                      </button>
                    )
                  })}
                </div>`;

content = content.replace(tasksSectionOriginal, tasksSectionReplacement);

// Filter tasks in the map
content = content.replace(
  '{tasks.map(task => (',
  '{tasks.filter(t => taskFilter === "all" || t.eventId === taskFilter).map(task => ('
);

// Add End Event toggle to event card
const eventCardOriginal = `                      <div className="flex-1 pr-10">
                        <h3 className="text-lg font-bold mb-1">{ev.title}</h3>
                        <p className="text-xs text-white/40 mb-3">Category: {ev.category || "General"} · {ev.durationDays || 0} days · {tasks.filter(t => t.eventId === ev.id).length} tasks</p>
                        <div className="bg-white/5 rounded-xl p-3 text-sm whitespace-pre-wrap">{ev.rewardText}</div>
                      </div>`;

const eventCardReplacement = `                      <div className="flex-1 pr-10">
                        <div className="flex justify-between items-start mb-1">
                          <h3 className="text-lg font-bold">{ev.title}</h3>
                          <label className="flex items-center gap-2 cursor-pointer mt-1">
                            <span className="text-[10px] text-white/50 font-bold uppercase tracking-wider">End</span>
                            <div className="relative">
                              <input type="checkbox" className="sr-only peer" checked={ev.isEnded || false}
                                onChange={async (e) => {
                                  const updated = { ...ev, isEnded: e.target.checked };
                                  if (e.target.checked) updated.durationDays = 0;
                                  await saveEvent(updated);
                                  setEvents(prev => prev.map(evt => evt.id === ev.id ? updated : evt));
                                }} />
                              <div className="w-7 h-4 bg-white/20 rounded-full peer peer-checked:bg-red-500 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all"></div>
                            </div>
                          </label>
                        </div>
                        <p className="text-xs text-white/40 mb-3">Category: {ev.category || "General"} · {ev.durationDays || 0} days · {tasks.filter(t => t.eventId === ev.id).length} tasks</p>
                        <div className="bg-white/5 rounded-xl p-3 text-sm whitespace-pre-wrap">{ev.rewardText}</div>
                      </div>`;

content = content.replace(eventCardOriginal, eventCardReplacement);

fs.writeFileSync(file, content);
console.log("Admin panel patched.");
