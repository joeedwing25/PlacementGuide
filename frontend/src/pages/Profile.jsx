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
  "Software Engineer", "Data Scientist", "AI Engineer", "Product Manager",
  "Cyber Security", "Cloud Engineer", "Frontend Engineer", "Backend Engineer",
  "Full Stack Developer", "ML Engineer",
];

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
      <Label>{label}</Label>
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
  const empty = {
    college: "", degree: "", branch: "", graduation_year: "",
    target_role: "Software Engineer",
    skills: [], languages: [], frameworks: [], databases: [], tools: [],
    github_url: "", leetcode_url: "", hackerrank_url: "", codeforces_url: "", linkedin_url: "",
    projects: [], achievements: [],
  };
  const [p, setP] = useState(empty);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/profile");
        if (data.profile) setP({ ...empty, ...data.profile, graduation_year: data.profile.graduation_year ?? "" });
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

  if (loading) return <div className="text-muted-foreground">Loading...</div>;

  return (
    <div className="max-w-4xl space-y-8" data-testid="profile-page">
      <header>
        <div className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Career profile</div>
        <h1 className="mt-2 text-3xl md:text-4xl font-heading font-black tracking-tighter">
          Tell us about yourself
        </h1>
        <p className="mt-2 text-muted-foreground">We use this to personalize every quiz, interview, and roadmap.</p>
      </header>

      <form onSubmit={save} className="space-y-6">
        <Card className="p-6 space-y-4">
          <h3 className="font-heading font-bold text-lg">Education</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>College</Label>
              <Input value={p.college} onChange={(e) => set("college", e.target.value)} placeholder="MIT" data-testid="profile-college" />
            </div>
            <div className="space-y-2">
              <Label>Degree</Label>
              <Input value={p.degree} onChange={(e) => set("degree", e.target.value)} placeholder="B.Tech" data-testid="profile-degree" />
            </div>
            <div className="space-y-2">
              <Label>Branch / Major</Label>
              <Input value={p.branch} onChange={(e) => set("branch", e.target.value)} placeholder="Computer Science" data-testid="profile-branch" />
            </div>
            <div className="space-y-2">
              <Label>Graduation year</Label>
              <Input type="number" value={p.graduation_year} onChange={(e) => set("graduation_year", e.target.value)} placeholder="2026" data-testid="profile-gradyear" />
            </div>
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <h3 className="font-heading font-bold text-lg">Target career</h3>
          <div className="space-y-2">
            <Label>Target role</Label>
            <Select value={p.target_role} onValueChange={(v) => set("target_role", v)}>
              <SelectTrigger data-testid="profile-target-role"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <h3 className="font-heading font-bold text-lg">Skills</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ChipsInput label="Programming languages" value={p.languages} onChange={(v) => set("languages", v)} placeholder="Python, Java..." testid="profile-languages" />
            <ChipsInput label="Frameworks" value={p.frameworks} onChange={(v) => set("frameworks", v)} placeholder="React, FastAPI..." testid="profile-frameworks" />
            <ChipsInput label="Databases" value={p.databases} onChange={(v) => set("databases", v)} placeholder="PostgreSQL, MongoDB..." testid="profile-databases" />
            <ChipsInput label="Tools" value={p.tools} onChange={(v) => set("tools", v)} placeholder="Docker, Git..." testid="profile-tools" />
          </div>
          <ChipsInput label="Other skills" value={p.skills} onChange={(v) => set("skills", v)} placeholder="System Design, ML..." testid="profile-skills" />
        </Card>

        <Card className="p-6 space-y-4">
          <h3 className="font-heading font-bold text-lg">Coding profiles</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>GitHub URL</Label><Input value={p.github_url} onChange={(e) => set("github_url", e.target.value)} data-testid="profile-github" /></div>
            <div className="space-y-2"><Label>LeetCode URL</Label><Input value={p.leetcode_url} onChange={(e) => set("leetcode_url", e.target.value)} data-testid="profile-leetcode" /></div>
            <div className="space-y-2"><Label>HackerRank URL</Label><Input value={p.hackerrank_url} onChange={(e) => set("hackerrank_url", e.target.value)} data-testid="profile-hackerrank" /></div>
            <div className="space-y-2"><Label>Codeforces URL</Label><Input value={p.codeforces_url} onChange={(e) => set("codeforces_url", e.target.value)} data-testid="profile-codeforces" /></div>
            <div className="space-y-2 md:col-span-2"><Label>LinkedIn URL</Label><Input value={p.linkedin_url} onChange={(e) => set("linkedin_url", e.target.value)} data-testid="profile-linkedin" /></div>
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-bold text-lg">Projects</h3>
            <Button type="button" variant="outline" size="sm" onClick={addProject} data-testid="profile-add-project">
              <Plus className="w-4 h-4 mr-1" /> Add project
            </Button>
          </div>
          {p.projects.length === 0 && <p className="text-sm text-muted-foreground">No projects yet.</p>}
          {p.projects.map((pr, i) => (
            <div key={i} className="border border-border rounded-md p-4 space-y-3" data-testid={`project-${i}`}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input value={pr.name} onChange={(e) => updateProject(i, "name", e.target.value)} placeholder="Project name" data-testid={`project-${i}-name`} />
                <Input value={pr.tech} onChange={(e) => updateProject(i, "tech", e.target.value)} placeholder="Tech stack" data-testid={`project-${i}-tech`} />
              </div>
              <Textarea value={pr.description} onChange={(e) => updateProject(i, "description", e.target.value)} placeholder="Brief description" rows={2} data-testid={`project-${i}-desc`} />
              <div className="flex gap-2">
                <Input value={pr.github} onChange={(e) => updateProject(i, "github", e.target.value)} placeholder="GitHub link" data-testid={`project-${i}-github`} />
                <Button type="button" variant="ghost" size="icon" onClick={() => removeProject(i)} data-testid={`project-${i}-remove`}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </Card>

        <Card className="p-6">
          <ChipsInput label="Achievements (certifications, awards, hackathons)" value={p.achievements} onChange={(v) => set("achievements", v)} placeholder="AWS Certified..." testid="profile-achievements" />
        </Card>

        <div className="sticky bottom-4 flex justify-end">
          <Button type="submit" disabled={saving} className="rounded-full font-semibold px-8" data-testid="profile-save-btn">
            {saving ? "Saving..." : "Save profile"}
          </Button>
        </div>
      </form>
    </div>
  );
}
