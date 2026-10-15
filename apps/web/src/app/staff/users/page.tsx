"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { Role } from "@irpc/types";
import { Badge, Button, Card, PageHeader, SelectField, TableWrap, TextField, td, th } from "@/components/ui";

const roles = Object.values(Role);

export default function Users() {
  const { users, addUser, toggleUser } = useStore();
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>(Role.USER);
  const [contact, setContact] = useState("");
  return (
    <>
      <PageHeader title="Users and roles" sub="Access follows role: farmers and buyers see prices, offers and their own records. Staff see operations and costing." />
      <Card>
        <h2 className="text-lg font-bold">Add user</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <SelectField label="Role" value={role} onChange={(e) => setRole(e.target.value as Role)}>{roles.map((r) => <option key={r}>{r}</option>)}</SelectField>
          <TextField label="Contact number" inputMode="tel" value={contact} onChange={(e) => setContact(e.target.value)} />
        </div>
        <div><Button disabled={!name.trim()} onClick={() => { addUser(name.trim(), role, contact.trim() || "None"); setName(""); setContact(""); }}>Add user</Button></div>
      </Card>
      <TableWrap>
        <thead><tr><th className={th}>ID</th><th className={th}>Name</th><th className={th}>Role</th><th className={th}>Contact</th><th className={th}>Status</th><th className={th}>Action</th></tr></thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}><td className={td}>{u.id}</td><td className={td}>{u.name}</td><td className={td}>{u.role}</td><td className={td}>{u.contact}</td>
              <td className={td}><Badge tone={u.active ? "ok" : "neutral"}>{u.active ? "Active" : "Inactive"}</Badge></td>
              <td className={td}><Button variant={u.active ? "danger" : "ghost"} className="min-h-11" onClick={() => toggleUser(u.id)}>{u.active ? "Deactivate" : "Activate"}</Button></td></tr>
          ))}
        </tbody>
      </TableWrap>
    </>
  );
}
