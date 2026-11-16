import { createPortal } from 'react-dom';
import { useRef, useState } from 'react';
import { GripVertical, Plus } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { exportCsv, memberKey, parseCsv, safeWebUrl, type PlanningWidgetFields, type PlanningMember, type PlanningTable, type TableColumn } from '@/lib/planning-widgets';

type Props = { data: PlanningWidgetFields; members: PlanningMember[]; settingsOpen: boolean; onChange: (patch: PlanningWidgetFields) => void };
export default function CleanTableWidget({ data, members, settingsOpen, onChange }: Props) {
  const table = data.table || { columns: [], rows: [] };
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');
  const [undo, setUndo] = useState<PlanningTable | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; kind: 'row' | 'column'; id: string } | null>(null);
  const save = (patch: Partial<PlanningTable>) => onChange({ table: { ...table, ...patch } });
  const cell = (rowId: string, columnId: string, value: string) => save({ rows: table.rows.map(row => row.id === rowId ? { ...row, cells: { ...row.cells, [columnId]: value } } : row) });
  const addRow = (index = table.rows.length) => { if (table.rows.length >= 500) return; const rows = [...table.rows]; rows.splice(index, 0, { id: crypto.randomUUID(), cells: {} }); save({ rows }); };
  const addColumn = (index = table.columns.length) => { if (table.columns.length >= 20) return; const columns = [...table.columns]; columns.splice(index, 0, { id: crypto.randomUUID(), name: `Column ${columns.length + 1}`, type: 'text' }); save({ columns }); };
  const openMenu = (event: React.MouseEvent, kind: 'row' | 'column', id: string) => { event.preventDefault(); setMenu({ x: Math.min(event.clientX, window.innerWidth - 220), y: Math.min(event.clientY, window.innerHeight - 330), kind, id }); };
  const download = () => { const url = URL.createObjectURL(new Blob([exportCsv([table.columns.map(column => column.name), ...table.rows.map(row => table.columns.map(column => row.cells[column.id] || ''))])], { type: 'text/csv;charset=utf-8;' })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'wander-table.csv'; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); };
  const importFile = async (file?: File) => {
    if (!file) return;
    try {
      if (file.size > 500000) throw new Error('Choose a CSV smaller than 500 KB.');
      const values = parseCsv((await file.text()).replace(/^\uFEFF/, ''));
      if (!values.length || values.length > 501 || values[0].length > 20 || values.some(row => row.length > values[0].length)) throw new Error('Use a header row, up to 20 columns, and 500 data rows.');
      if (table.rows.length && !window.confirm('Replace this table with the CSV? You can undo the import.')) return;
      setUndo(table);
      const columns = values[0].map((name, index) => ({ id: crypto.randomUUID(), name: name || `Column ${index + 1}`, type: 'text' as const }));
      save({ columns, rows: values.slice(1).map(row => ({ id: crypto.randomUUID(), cells: Object.fromEntries(columns.map((column, index) => [column.id, row[index] || ''])) })) });
      setMessage('CSV imported.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to import CSV.'); }
    if (fileRef.current) fileRef.current.value = '';
  };
  const selectedColumn = menu?.kind === 'column' ? table.columns.find(column => column.id === menu.id) : undefined;
  const index = menu?.kind === 'column' ? table.columns.findIndex(column => column.id === menu.id) : table.rows.findIndex(row => row.id === menu?.id);
  return <div className="clean-table-widget">
    {settingsOpen && <div className="widget-settings-panel"><label><input type="checkbox" checked={Boolean(data.tableOptions?.showTotals)} onChange={event => onChange({ tableOptions: { showTotals: event.target.checked } })} /> Show numeric totals</label><div className="flex gap-2"><button onClick={() => fileRef.current?.click()}>Import CSV</button><button disabled={!table.columns.length} onClick={download}>Export CSV</button></div><p>Click a column heading or row handle for options. Right-click works too.</p></div>}
    <input ref={fileRef} hidden type="file" accept=".csv,text/csv" aria-label="Import CSV file" onChange={event => void importFile(event.target.files?.[0])} />
    {(message || undo) && <div className="table-notice"><span>{message}</span>{undo && <button onClick={() => { onChange({ table: undo }); setUndo(null); setMessage(''); }}>Undo</button>}</div>}
    <div className="clean-table-scroll"><table className="clean-table"><caption className="sr-only">Custom planning table</caption><thead><tr><th className="table-row-handle" />{table.columns.map(column => <th key={column.id} onContextMenu={event => openMenu(event, 'column', column.id)}><button className="table-column-heading" aria-label={`Column ${column.name} options`} onClick={event => openMenu(event, 'column', column.id)}>{column.name || 'Untitled'}</button></th>)}<th className="table-edge"><button disabled={table.columns.length >= 20} aria-label="Add column" onClick={() => addColumn()}><Plus size={15} /></button></th></tr></thead>
      <tbody>{table.rows.map((row, rowIndex) => <tr key={row.id} onContextMenu={event => openMenu(event, 'row', row.id)}><td className="table-row-handle"><button aria-label={`Row ${rowIndex + 1} options`} onClick={event => openMenu(event, 'row', row.id)}><GripVertical size={12} /></button></td>{table.columns.map(column => <td key={column.id} onContextMenu={event => openMenu(event, 'row', row.id)}>{column.type === 'checkbox' ? <input className="table-cell-checkbox" type="checkbox" aria-label={`${column.name} row ${rowIndex + 1}`} checked={row.cells[column.id] === 'true'} onChange={event => cell(row.id, column.id, String(event.target.checked))} /> : column.type === 'member' ? <select aria-label={`${column.name} row ${rowIndex + 1}`} value={row.cells[column.id] || ''} onChange={event => cell(row.id, column.id, event.target.value)}><option value="" />{members.map(member => <option key={memberKey(member)} value={memberKey(member)}>{member.name || member.email}</option>)}</select> : <div className="flex items-center"><input aria-label={`${column.name} row ${rowIndex + 1}`} type={column.type === 'date' && (!row.cells[column.id] || /^\d{4}-\d{2}-\d{2}$/.test(row.cells[column.id])) ? 'date' : 'text'} inputMode={column.type === 'number' ? 'decimal' : undefined} value={row.cells[column.id] || ''} onChange={event => cell(row.id, column.id, event.target.value)} />{column.type === 'link' && safeWebUrl(row.cells[column.id] || '') && <a className="mr-2 text-primary" aria-label={`Open ${column.name} row ${rowIndex + 1}`} target="_blank" rel="noopener noreferrer" href={safeWebUrl(row.cells[column.id])}>↗</a>}</div>}</td>)}<td className="table-edge" /></tr>)}
      <tr className="table-add-row"><td /><td colSpan={Math.max(1, table.columns.length)}><button disabled={!table.columns.length || table.rows.length >= 500} onClick={() => addRow()} aria-label="Add row"><Plus size={14} />New</button></td><td /></tr></tbody>
      {data.tableOptions?.showTotals && <tfoot><tr><td />{table.columns.map(column => <td key={column.id}>{column.type === 'number' ? `Total: ${table.rows.reduce((sum, row) => sum + (Number.isFinite(Number(row.cells[column.id])) ? Number(row.cells[column.id]) : 0), 0).toLocaleString()}` : ''}</td>)}<td /></tr></tfoot>}
    </table></div>
    <DropdownMenu open={Boolean(menu)} onOpenChange={open => { if (!open) setMenu(null); }} modal={false}>{typeof document !== 'undefined' && createPortal(<DropdownMenuTrigger asChild><button tabIndex={-1} aria-hidden="true" style={{ position: 'fixed', left: menu?.x || 0, top: menu?.y || 0, width: 1, height: 1, opacity: 0, pointerEvents: 'none' }} /></DropdownMenuTrigger>, document.body)}<DropdownMenuContent align="start" sideOffset={0} onCloseAutoFocus={event => event.preventDefault()} className="w-52">
      {selectedColumn && <div className="p-2"><label className="text-xs text-muted-foreground">Column name<input autoFocus className="mt-1 w-full rounded border border-border bg-background p-1.5 text-sm" aria-label="Column name" value={selectedColumn.name} onKeyDown={event => event.stopPropagation()} onChange={event => save({ columns: table.columns.map(column => column.id === selectedColumn.id ? { ...column, name: event.target.value } : column) })} /></label></div>}
      {selectedColumn && <><DropdownMenuSeparator />{(['text', 'number', 'date', 'checkbox', 'member', 'link'] as TableColumn['type'][]).map(type => <DropdownMenuItem key={type} onSelect={() => save({ columns: table.columns.map(column => column.id === selectedColumn.id ? { ...column, type } : column) })}>{type === selectedColumn.type ? '✓ ' : ''}{type[0].toUpperCase() + type.slice(1)}</DropdownMenuItem>)}<DropdownMenuSeparator /></>}
      <DropdownMenuItem onSelect={() => menu?.kind === 'column' ? addColumn(index) : addRow(index)}>Insert {menu?.kind === 'column' ? 'left' : 'above'}</DropdownMenuItem>
      <DropdownMenuItem onSelect={() => menu?.kind === 'column' ? addColumn(index + 1) : addRow(index + 1)}>Insert {menu?.kind === 'column' ? 'right' : 'below'}</DropdownMenuItem>
      <DropdownMenuItem className="text-destructive" onSelect={() => { setUndo(table); setMessage(`${menu?.kind === 'column' ? 'Column' : 'Row'} deleted.`); if (menu?.kind === 'column') save({ columns: table.columns.filter(column => column.id !== menu.id), rows: table.rows.map(row => ({ ...row, cells: Object.fromEntries(Object.entries(row.cells).filter(([id]) => id !== menu.id)) })) }); else save({ rows: table.rows.filter(row => row.id !== menu?.id) }); }}>Delete {menu?.kind}</DropdownMenuItem>
    </DropdownMenuContent></DropdownMenu>
  </div>;
}
