import React, { useEffect, useRef, useState } from "react";
import api, { formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function Resume() {
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [resume, setResume] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/resume/latest");
        if (data.resume) setResume(data.resume);
      } catch {}
    })();
  }, []);

  const onPick = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!/\.(pdf|docx)$/i.test(f.name)) {
      toast.error("Please upload a PDF or DOCX file");
      return;
    }
    setFile(f);
  };

  const onAnalyze = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/resume/analyze", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setResume(data.resume);
      toast.success("Resume analyzed");
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setBusy(false);
    }
  };

  const a = resume?.analysis;

  return (
    <div className="space-y-8" data-testid="resume-page">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Resume Analyzer</h1>
        <p className="mt-2 text-muted-foreground text-lg">Upload your resume to get an ATS score and improvement suggestions.</p>
      </header>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Upload */}
        <Card className="p-8" data-testid="resume-upload-card">
          <div
            className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors ${file ? "border-primary bg-primary/5" : "border-border hover:bg-secondary/50"}`}
            onClick={() => fileRef.current?.click()}
            data-testid="resume-dropzone"
          >
            <Upload className="w-10 h-10 mx-auto text-muted-foreground" />
            <div className="mt-4 font-bold">Drop your resume here or click to browse</div>
            <div className="text-sm text-muted-foreground mt-1">PDF or DOCX · max 5MB</div>
            {file && (
              <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-surface border border-border rounded-md text-sm">
                <FileText className="w-4 h-4" /> {file.name}
              </div>
            )}
            <input ref={fileRef} type="file" accept=".pdf,.docx" className="hidden" onChange={onPick} data-testid="resume-file-input" />
          </div>
          <Button onClick={onAnalyze} disabled={!file || busy} className="w-full mt-6 font-semibold gap-2" data-testid="resume-analyze-btn">
             {busy ? "Analyzing..." : "Analyze Resume"}
          </Button>
        </Card>

        {/* Results */}
        <Card className="p-8" data-testid="resume-results-card">
          {!resume && (
            <div className="text-center text-muted-foreground py-16">
              <FileText className="w-12 h-12 mx-auto opacity-40" />
              <div className="mt-4">Your analysis will appear here.</div>
            </div>
          )}
          {resume && a && (
            <div className="space-y-6">
              <div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground">Latest file</div>
                <div className="font-mono mt-1 font-bold">{resume.filename}</div>
              </div>
              <div className="space-y-4">
                {[
                  ["ATS Score", a.ats_score],
                  ["Skill Match", a.skill_match_score],
                  ["Resume Quality", a.resume_quality_score],
                ].map(([k, v]) => (
                  <div key={k} data-testid={`resume-score-${k.toLowerCase().replace(/\s+/g, '-')}`}>
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{k}</span>
                      <span className="font-mono font-bold tabular-nums">{v}%</span>
                    </div>
                    <Progress value={v || 0} className="mt-2 h-2" />
                  </div>
                ))}
              </div>
              {a.summary && (
                <div className="bg-muted p-4 rounded-md text-sm leading-relaxed">{a.summary}</div>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* Detailed feedback */}
      {resume && a && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6" data-testid="resume-feedback">
          {a.strengths?.length > 0 && (
            <Card className="p-6">
              <h3 className="font-bold text-lg flex items-center gap-2"><CheckCircle className="w-5 h-5 text-emerald-500" /> Strengths</h3>
              <ul className="mt-3 space-y-2 text-sm">{a.strengths.map((s, i) => <li key={i}>• {s}</li>)}</ul>
            </Card>
          )}
          {a.missing_skills?.length > 0 && (
            <Card className="p-6">
              <h3 className="font-bold text-lg flex items-center gap-2"><AlertCircle className="w-5 h-5 text-amber-500" /> Missing Skills</h3>
              <div className="mt-3 flex flex-wrap gap-2">{a.missing_skills.map((s, i) => <Badge key={i} variant="secondary">{s}</Badge>)}</div>
            </Card>
          )}
          {a.missing_keywords?.length > 0 && (
            <Card className="p-6">
              <h3 className="font-bold text-lg">Missing Keywords</h3>
              <div className="mt-3 flex flex-wrap gap-2">{a.missing_keywords.map((s, i) => <Badge key={i} variant="outline">{s}</Badge>)}</div>
            </Card>
          )}
          {a.improvement_suggestions?.length > 0 && (
            <Card className="p-6">
              <h3 className="font-bold text-lg">Improvement Suggestions</h3>
              <ul className="mt-3 space-y-2 text-sm">{a.improvement_suggestions.map((s, i) => <li key={i}>• {s}</li>)}</ul>
            </Card>
          )}
          {a.weak_bullets?.length > 0 && (
            <Card className="p-6 md:col-span-2">
              <h3 className="font-bold text-lg">Bullet Point Rewrites</h3>
              <div className="mt-4 space-y-4">
                {a.weak_bullets.map((b, i) => (
                  <div key={i} className="grid md:grid-cols-2 gap-3" data-testid={`bullet-rewrite-${i}`}>
                    <div className="border border-border rounded-md p-3 text-sm">
                      <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Original</div>
                      {b.original}
                    </div>
                    <div className="border border-primary/40 bg-primary/5 rounded-md p-3 text-sm">
                      <div className="text-xs uppercase tracking-widest text-primary mb-1">Improved</div>
                      {b.improved}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
          {a.grammar_issues?.length > 0 && (
            <Card className="p-6">
              <h3 className="font-bold text-lg">Grammar Issues</h3>
              <ul className="mt-3 space-y-2 text-sm">{a.grammar_issues.map((s, i) => <li key={i}>• {s}</li>)}</ul>
            </Card>
          )}
          {a.missing_metrics?.length > 0 && (
            <Card className="p-6">
              <h3 className="font-bold text-lg">Add Metrics</h3>
              <ul className="mt-3 space-y-2 text-sm">{a.missing_metrics.map((s, i) => <li key={i}>• {s}</li>)}</ul>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
