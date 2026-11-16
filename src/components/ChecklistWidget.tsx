import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useSession } from '@/lib/auth/auth-client';
import { avatarStyle } from '@/lib/planning';
import { checklistGroups, memberKey, taskGroup, type PlanningWidgetFields, type PlanningTask, type PlanningMember } from '@/lib/planning-widgets';

type Props = { data: PlanningWidgetFields; members: PlanningMember[]; settingsOpen: boolean; onChange: (patch: PlanningWidgetFields) => void; onSplit: () => void; onCombine: () => void };
export default function ChecklistWidget({ data, members, settingsOpen, onChange, onSplit, onCombine }: Props) {
  const { user } = useSession();
  const me = user?.id || user?.email || '';
  const tasks = data.tasks || [];
  const groups = checklistGroups(data);
  const [focusId, setFocusId] = useState('');
  const done = (task: PlanningTask) => task.assignee === 'everyone' ? members.length > 0 && members.every(member => task.completedBy.includes(memberKey(member))) : task.done;
  const update = (task: PlanningTask) => onChange({ tasks: tasks.map(item => item.id === task.id ? { ...task, checklistId: taskGroup(task) } : item), checklists: groups });
  const addGroup = () => { const group = { id: crypto.randomUUID(), title: groups.length ? `Checklist ${groups.length + 1}` : 'Checklist' }; onChange({ checklists: [...groups, group] }); };
  const addItem = (groupId: string) => {
    const group = groups.find(item => item.id === groupId)!;
    const id = crypto.randomUUID(); setFocusId(id);
    onChange({ checklists: groups, tasks: [...tasks, { id, title: '', checklistId: group.id, section: group.title, assignee: '', due: '', done: false, completedBy: [] }] });
  };
  const template = (packing: boolean) => {
    const group = { id: crypto.randomUUID(), title: packing ? 'Packing' : 'Before departure' };
    onChange({ checklists: [...groups, group], tasks: [...tasks, ...(packing ? ['Clothes', 'Chargers', 'Medication'] : ['Check passport expiry', 'Arrange airport transport', 'Confirm accommodation']).map(title => ({ id: crypto.randomUUID(), title, checklistId: group.id, section: group.title, assignee: 'everyone', due: '', done: false, completedBy: [] }))] });
  };
  return <div className="clean-checklist">
    {settingsOpen && <div className="widget-settings-panel">
      <label><input type="checkbox" checked={Boolean(data.checklistOptions?.hideCompleted)} onChange={event => onChange({ checklistOptions: { hideCompleted: event.target.checked } })} /> Hide completed items</label>
      <div className="flex flex-wrap gap-2"><button onClick={() => template(true)}>Packing template</button><button onClick={() => template(false)}>Before departure template</button></div>
      {data.checklistExpanded ? <button onClick={onCombine}>Combine checklists into one widget</button> : <button disabled={groups.length < 2} onClick={onSplit}>Split checklists into widgets</button>}
    </div>}
    {groups.map(group => <section className="checklist-group" key={group.id}>
      <div className="checklist-group-heading"><input aria-label={`Checklist name ${group.title}`} value={group.title} onChange={event => onChange({ checklists: groups.map(item => item.id === group.id ? { ...item, title: event.target.value } : item), tasks: tasks.map(task => taskGroup(task) === group.id ? { ...task, checklistId: group.id, section: event.target.value } : task) })} />{settingsOpen && <button title="Delete checklist" aria-label={`Delete checklist ${group.title}`} onClick={() => onChange({ checklists: groups.filter(item => item.id !== group.id), tasks: tasks.filter(task => taskGroup(task) !== group.id) })}><X size={13} /></button>}</div>
      {tasks.filter(task => taskGroup(task) === group.id && !(data.checklistOptions?.hideCompleted && done(task))).map(task => <div key={task.id}>
        <div className={`checklist-item ${done(task) ? 'is-complete' : ''}`}>
          <input autoFocus={focusId === task.id} aria-label={`Task ${task.title || 'new item'}`} placeholder="To-do" value={task.title} onChange={event => update({ ...task, title: event.target.value })} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); addItem(group.id); } }} />
          <span className="flex -space-x-1">{task.completedBy.map(id => { const member = members.find(person => memberKey(person) === id); return <span key={id} style={avatarStyle(id)} className="completion-avatar" title={`Completed by ${member?.name || member?.email || 'Former member'}`} aria-label={`Completed by ${member?.name || member?.email || 'Former member'}`}>{member?.image ? <img src={member.image} alt="" /> : (member?.name || member?.email || '?')[0].toUpperCase()}</span>; })}</span>
          <button className="checklist-remove" aria-label={`Delete ${task.title || 'item'}`} onClick={() => onChange({ tasks: tasks.filter(item => item.id !== task.id), checklists: groups })}><X size={14} /></button>
          <input className="checklist-checkbox" aria-label={`Complete ${task.title || 'item'}${task.assignee === 'everyone' ? ' for yourself' : ''}`} type="checkbox" checked={task.assignee === 'everyone' ? task.completedBy.includes(me) : task.done} onChange={event => update({ ...task, done: task.assignee === 'everyone' ? false : event.target.checked, completedBy: task.assignee === 'everyone' ? event.target.checked ? [...new Set([...task.completedBy, me])] : task.completedBy.filter(id => id !== me) : event.target.checked ? [me] : [] })} />
        </div>
        {task.assignee === 'everyone' && <p className="checklist-task-meta">{members.filter(member => task.completedBy.includes(memberKey(member))).length}/{members.length} complete</p>}
        {task.due && <p className="checklist-task-meta">Due {task.due}</p>}
        {settingsOpen && <div className="checklist-task-settings"><select aria-label={`Assign ${task.title || 'item'}`} value={task.assignee} onChange={event => update({ ...task, assignee: event.target.value, done: false, completedBy: [] })}><option value="">Shared</option><option value="everyone">Everyone individually</option>{members.map(member => <option key={memberKey(member)} value={memberKey(member)}>{member.name || member.email}</option>)}</select><input aria-label={`Due date ${task.title || 'item'}`} type="date" value={task.due} onChange={event => update({ ...task, due: event.target.value })} /></div>}
      </div>)}
      <button className="checklist-add" aria-label={`Add item to ${group.title}`} onClick={() => addItem(group.id)}><Plus size={14} /><span>Add</span></button>
    </section>)}
    <button className="checklist-add" onClick={addGroup}><Plus size={14} />{groups.length ? 'Checklist' : 'Add checklist'}</button>
  </div>;
}
