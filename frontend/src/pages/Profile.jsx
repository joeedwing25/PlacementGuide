import React, { useEffect, useState } from "react";
import api, { formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";

const ROLES = [
  "Software Engineer", "Data Scientist", "Backend Engineer", "Frontend Engineer",
  "Full Stack Developer", "Mobile Developer", "DevOps Engineer", "Product Manager",
  "Cyber Security", "Cloud Engineer",
];

const INITIAL_PROFILE_STATE = {
  college: "", degree: "", branch: "", graduation_year: "",
  target_role: "Software Engineer",
  skills: [], languages: [], frameworks: [], databases: [], tools: [],
  github_url: "", leetcode_url: "", hackerrank_url: "", codeforces_url: "", linkedin_url: "",
  projects: [], achievements: [],
};

function ChipsInput({ label, value, onChange, placeholder, testid }) {
  const [input, setInput] = useState("");
  const add = () => {
    const v = input.trim();
    if (!v) return;
    if (!value.includes(v)) onChange([...value, v]);
    setInput("");
  };
  return (
    <div className="space-y-2">
      <Label className="font-bold">{label}</Label>
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder={placeholder}
          data-testid={`${testid}-input`}
        />
        <Button type="button" variant="outline" size="icon" onClick={add} data-testid={`${testid}-add`}>
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {value.map((v) => (
          <Badge key={v} variant="secondary" className="gap-1" data-testid={`${testid}-chip-${v}`}>
            {v}
            <button type="button" onClick={() => onChange(value.filter((x) => x !== v))} className="hover:text-destructive">
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ))}
      </div>
    </div>
  );
}

export default function Profile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [p, setP] = useState(INITIAL_PROFILE_STATE);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/profile");
        if (data.profile) setP({ ...INITIAL_PROFILE_STATE, ...data.profile, graduation_year: data.profile.graduation_year ?? "" });
      } finally { setLoading(false); }
    })();
  }, []);

  const set = (k, v) => setP((s) => ({ ...s, [k]: v }));

  const save = async (e) => {
    e?.preventDefault();
    setSaving(true);
    try {
      const payload = { ...p, graduation_year: p.graduation_year ? Number(p.graduation_year) : null };
      await api.put("/profile", payload);
      toast.success("Profile saved");
    } catch (e) {
      toast.error(formatApiError(e));
    } finally { setSaving(false); }
  };

  const addProject = () => set("projects", [...p.projects, { name: "", description: "", tech: "", github: "" }]);
  const updateProject = (i, k, v) => {
    const next = [...p.projects];
    next[i] = { ...next[i], [k]: v };
    set("projects", next);
  };
  const removeProject = (i) => set("projects", p.projects.filter((_, idx) => idx !== i));

  if (loading) return <div className="text-muted-foreground p-8 text-center">Loading profile...</div>;

  return (
    <div className="max-w-4xl space-y-8" data-testid="profile-page">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Your Profile</h1>
        <p className="mt-2 text-muted-foreground text-lg">Manage your academic and technical details for placement preparation.</p>
      </header>

      <form onSubmit={save} className="space-y-6 pb-12">
        <Card className="p-6 space-y-6">
          <h3 className="font-bold text-xl border-b pb-2">Academic Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>College Name</Label>
              <Input value={p.college} onChange={(e) => set("college", e.target.value)} placeholder="e.g. Stanford University" data-testid="profile-college" />
            </div>
            <div className="space-y-2">
              <Label>Degree</Label>
              <Input value={p.degree} onChange={(e) => set("degree", e.target.value)} placeholder="e.g. B.Tech, M.S." data-testid="profile-degree" />
            </div>
            <div className="space-y-2">
              <Label>Branch / Major</Label>
              <Input value={p.branch} onChange={(e) => set("branch", e.target.value)} placeholder="e.g. Computer Science" data-testid="profile-branch" />
            </div>
            <div className="space-y-2">
              <Label>Graduation Year</Label>
              <Input type="number" value={p.graduation_year} onChange={(e) => set("graduation_year", e.target.value)} placeholder="2026" data-testid="profile-gradyear" />
            </div>
          </div>
        </Card>

        <Card className="p-6 space-y-6">
          <h3 className="font-bold text-xl border-b pb-2">Career Goal</h3>
          <div className="space-y-2">
            <Label>Target Role</Label>
            <Select value={p.target_role} onValueChange={(v) => set("target_role", v)}>
              <SelectTrigger data-testid="profile-target-role"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </Card>

        <Card className="p-6 space-y-6">
          <h3 className="font-bold text-xl border-b pb-2">Technical Skills</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ChipsInput label="Programming Languages" value={p.languages} onChange={(v) => set("languages", v)} placeholder="Python, Java..." testid="profile-languages" />
            <ChipsInput label="Frameworks & Libraries" value={p.frameworks} onChange={(v) => set("frameworks", v)} placeholder="React, FastAPI..." testid="profile-frameworks" />
            <ChipsInput label="Databases" value={p.databases} onChange={(v) => set("databases", v)} placeholder="PostgreSQL, MongoDB..." testid="profile-databases" />
            <ChipsInput label="Tools" value={p.tools} onChange={(v) => set("tools", v)} placeholder="Docker, Git..." testid="profile-tools" />
          </div>
          <ChipsInput label="Other Skills" value={p.skills} onChange={(v) => set("skills", v)} placeholder="System Design, ML..." testid="profile-skills" />
        </Card>

        <Card className="p-6 space-y-6">
          <h3 className="font-bold text-xl border-b pb-2">Online Profiles</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2"><Label>GitHub URL</Label><Input value={p.github_url} onChange={(e) => set("github_url", e.target.value)} placeholder="https://github.com/..." data-testid="profile-github" /></div>
            <div className="space-y-2"><Label>LinkedIn URL</Label><Input value={p.linkedin_url} onChange={(e) => set("linkedin_url", e.target.value)} placeholder="https://linkedin.com/in/..." data-testid="profile-linkedin" /></div>
            <div className="space-y-2"><Label>LeetCode URL</Label><Input value={p.leetcode_url} onChange={(e) => set("leetcode_url", e.target.value)} placeholder="https://leetcode.com/..." data-testid="profile-leetcode" /></div>
            <div className="space-y-2"><Label>HackerRank URL</Label><Input value={p.hackerrank_url} onChange={(e) => set("hackerrank_url", e.target.value)} placeholder="https://hackerrank.com/..." data-testid="profile-hackerrank" /></div>
          </div>
        </Card>

        <Card className="p-6 space-y-6">
          <div className="flex items-center justify-between border-b pb-2">
            <h3 className="font-bold text-xl">Projects</h3>
            <Button type="button" variant="outline" size="sm" onClick={addProject} data-testid="profile-add-project">
              <Plus className="w-4 h-4 mr-1" /> Add Project
            </Button>
          </div>
          {p.projects.length === 0 && <p className="text-sm text-muted-foreground italic text-center py-4">No projects added yet.</p>}
          <div className="grid gap-4">
            {p.projects.map((pr, i) => (
              <div key={i} className="border rounded-lg p-4 space-y-4 bg-muted/20 relative" data-testid={`project-${i}`}>
                <Button type="button" variant="ghost" size="icon" onClick={() => removeProject(i)} className="absolute top-2 right-2 text-muted-foreground hover:text-destructive" data-testid={`project-${i}-remove`}>
                  <X className="w-4 h-4" />
                </Button>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs">Project Name</Label>
                    <Input value={pr.name} onChange={(e) => updateProject(i, "name", e.target.value)} placeholder="e.g. Personal Portfolio" data-testid={`project-${i}-name`} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Tech Stack</Label>
                    <Input value={pr.tech} onChange={(e) => updateProject(i, "tech", e.target.value)} placeholder="e.g. React, Node.js" data-testid={`project-${i}-tech`} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Description</Label>
                  <Textarea value={pr.description} onChange={(e) => updateProject(i, "description", e.target.value)} placeholder="Briefly describe what you built..." rows={2} data-testid={`project-${i}-desc`} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Project Link (GitHub/Live)</Label>
                  <Input value={pr.github} onChange={(e) => updateProject(i, "github", e.target.value)} placeholder="https://..." data-testid={`project-${i}-github`} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6 space-y-6">
          <h3 className="font-bold text-xl border-b pb-2">Achievements</h3>
          <ChipsInput label="Certifications & Awards" value={p.achievements} onChange={(v) => set("achievements", v)} placeholder="e.g. Hackathon Winner, AWS Certified..." testid="profile-achievements" />
        </Card>

        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={saving} size="lg" className="px-12 font-bold" data-testid="profile-save-btn">
            {saving ? "Saving Changes..." : "Save Profile"}
          </Button>
        </div>
      </form>
    </div>
  );
}
