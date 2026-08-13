import { useState } from "react";

import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import { Field, Select, TextInput } from "../components/ui/Field";
import PageShell from "../components/PageShell";
import SectionHeading from "../components/SectionHeading";
import useTaskFlow, { useTaskFlowActions } from "../hooks/useTaskFlow";
import { memberRoles } from "../lib/taskflow";

function SettingsPage() {
  const { company, members } = useTaskFlow();
  const {
    inviteMember,
    updateCompany,
    updateMemberRole,
    removeMember,
    resetWorkspace,
  } = useTaskFlowActions();

  const [companyForm, setCompanyForm] = useState({
    name: company.name,
    plan: company.plan,
  });
  const [inviteForm, setInviteForm] = useState({
    name: "",
    email: "",
    role: "Member",
  });
  const [message, setMessage] = useState("");

  const handleCompanySave = async (event) => {
    event.preventDefault();
    const result = await updateCompany(companyForm);
    setMessage(result?.ok === false ? result.error : "Company profile saved.");
  };

  const handleInvite = async (event) => {
    event.preventDefault();
    if (!inviteForm.email.trim()) return;
    const result = await inviteMember(inviteForm);
    if (result?.ok === false) {
      setMessage(result.error);
      return;
    }
    if (result?.invite_token) {
      const link = `${window.location.origin}/register?invite=${result.invite_token}&email=${encodeURIComponent(inviteForm.email)}`;
      setMessage(`Invite sent to ${inviteForm.email}. Share this join link if needed: ${link}`);
    } else {
      setMessage(`Invite sent to ${inviteForm.email}.`);
    }
    setInviteForm({ name: "", email: "", role: "Member" });
  };

  return (
    <PageShell>
      <SectionHeading
        eyebrow="Settings"
        title="Company settings and member management"
        description="Owner/Admin only — update company profile, invite members, and manage RBAC roles (Owner, Admin, Manager, Member)."
      />

      {message ? (
        <Card className="border-[var(--tf-border-strong)] bg-[var(--tf-accent-soft)] p-4 text-sm text-[var(--tf-accent)]">
          {message}
        </Card>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="p-6">
          <p className="tf-eyebrow">Company profile</p>
          <h3 className="tf-title mt-2 text-xl">Workspace details</h3>
          <form className="mt-5 space-y-4" onSubmit={handleCompanySave}>
            <Field label="Company name">
              <TextInput
                value={companyForm.name}
                onChange={(event) =>
                  setCompanyForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label="Plan">
              <Select
                value={companyForm.plan}
                onChange={(event) =>
                  setCompanyForm((current) => ({
                    ...current,
                    plan: event.target.value,
                  }))
                }
              >
                {["Free", "Pro", "Business", "Enterprise"].map((plan) => (
                  <option key={plan}>{plan}</option>
                ))}
              </Select>
            </Field>
            <Button type="submit" variant="primary">
              Save company
            </Button>
          </form>
        </Card>

        <Card className="p-6">
          <p className="tf-eyebrow">Invite member</p>
          <h3 className="tf-title mt-2 text-xl">Add team access</h3>
          <form className="mt-5 space-y-4" onSubmit={handleInvite}>
            <Field label="Full name">
              <TextInput
                value={inviteForm.name}
                onChange={(event) =>
                  setInviteForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="Full name"
              />
            </Field>
            <Field label="Email">
              <TextInput
                value={inviteForm.email}
                onChange={(event) =>
                  setInviteForm((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
                placeholder="teammate@company.com"
              />
            </Field>
            <Field label="Role">
              <Select
                value={inviteForm.role}
                onChange={(event) =>
                  setInviteForm((current) => ({
                    ...current,
                    role: event.target.value,
                  }))
                }
              >
                {memberRoles.map((role) => (
                  <option key={role}>{role}</option>
                ))}
              </Select>
            </Field>
            <Button type="submit" variant="primary" className="w-full">
              Send invite
            </Button>
          </form>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="tf-eyebrow">Members</p>
            <h3 className="tf-title mt-2 text-xl">Role-based access control</h3>
          </div>
          <Badge tone="muted">{members.length} people</Badge>
        </div>

        <div className="mt-5 overflow-x-auto rounded-2xl border border-[var(--tf-border)]">
          <table className="w-full min-w-[720px] text-left">
            <thead className="bg-white/[0.03] text-[0.7rem] uppercase tracking-[0.22em] text-[var(--tf-faint)]">
              <tr>
                <th className="px-4 py-4">Name</th>
                <th className="px-4 py-4">Email</th>
                <th className="px-4 py-4">Role</th>
                <th className="px-4 py-4">Status</th>
                <th className="px-4 py-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr
                  key={member.id}
                  className="border-t border-[var(--tf-border)] bg-[rgba(6,16,24,0.35)]"
                >
                  <td className="px-4 py-4 font-semibold text-white">
                    {member.name}
                  </td>
                  <td className="px-4 py-4 text-[var(--tf-muted)]">{member.email}</td>
                  <td className="px-4 py-4">
                    <Select
                      value={member.role}
                      disabled={member.role === "Owner"}
                      onChange={async (event) => {
                        const result = await updateMemberRole(
                          member.id,
                          event.target.value
                        );
                        if (result?.ok === false) setMessage(result.error);
                      }}
                      className="!py-2"
                    >
                      {memberRoles.map((role) => (
                        <option key={role}>{role}</option>
                      ))}
                    </Select>
                  </td>
                  <td className="px-4 py-4">
                    <Badge
                      tone={member.status === "Online" ? "success" : "muted"}
                    >
                      {member.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-4">
                    {member.role === "Owner" ? (
                      <span className="text-xs text-[var(--tf-faint)]">Protected</span>
                    ) : (
                      <Button
                        variant="danger"
                        className="!px-3 !py-2 !text-xs"
                        onClick={async () => {
                          const result = await removeMember(member.id);
                          if (result?.ok === false) setMessage(result.error);
                        }}
                      >
                        Remove
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-6">
        <p className="text-sm font-semibold text-white">Demo utilities</p>
        <p className="mt-2 text-sm text-[var(--tf-muted)]">
          Reset local workspace seed data stored in the browser.
        </p>
        <Button
          variant="secondary"
          className="mt-4"
          onClick={() => {
            if (window.confirm("Reset all local TaskFlow workspace data?")) {
              resetWorkspace();
              setCompanyForm({ name: "Northstar Studio", plan: "Pro" });
              setMessage("Workspace reset to seed data.");
            }
          }}
        >
          Reset workspace data
        </Button>
      </Card>
    </PageShell>
  );
}

export default SettingsPage;
