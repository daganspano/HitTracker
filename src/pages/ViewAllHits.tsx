import { useState } from "react";
import {
  Typography,
  Box,
  Button,
  List,
  ListItem,
  ListItemText,
  Chip,
  Stack,
  LinearProgress,
  Alert,
} from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import hitsData from "../data/hits.json";
import workExperienceData from "../data/workExperience.json";
import softwareSkillsData from "../data/softwareSkills.json";
import {
  updateResume,
  saveResume,
  WorkExperience,
  SoftwareSkills,
  ProgressStep,
} from "../functions/updateResume";

interface HitEntry {
  key: number;
  task: string;
  time: number;
}

interface WeekData {
  week: string;
  total: number;
  hits: HitEntry[];
}

interface Row {
  id: number;
  week: string;
  hit: string;
}

const columns: GridColDef[] = [
  { field: "week", headerName: "Week", width: 150 },
  { field: "hit", headerName: "Hit", flex: 1 },
];

const STEP_LABELS: Record<ProgressStep, string> = {
  "collecting-hits": "Collecting hits...",
  "generating-experience": "Generating experience bullets...",
  "generating-skills": "Generating software skills...",
  validating: "Validating output...",
  persisting: "Saving...",
  done: "Done",
};

const STEP_PROGRESS: Record<ProgressStep, number> = {
  "collecting-hits": 10,
  "generating-experience": 40,
  "generating-skills": 70,
  validating: 90,
  persisting: 95,
  done: 100,
};

type UpdateState = "idle" | "loading" | "preview";

function ViewAllHits() {
  const [workExperience, setWorkExperience] =
    useState<WorkExperience>(workExperienceData);
  const [softwareSkills, setSoftwareSkills] =
    useState<SoftwareSkills>(softwareSkillsData);

  const [generatedExperience, setGeneratedExperience] =
    useState<WorkExperience | null>(null);
  const [generatedSkills, setGeneratedSkills] = useState<SoftwareSkills | null>(
    null,
  );

  const [updateState, setUpdateState] = useState<UpdateState>("idle");
  const [progressStep, setProgressStep] = useState<ProgressStep | null>(null);
  const [error, setError] = useState<string | null>(null);

  const weeks = [...(hitsData as WeekData[])].reverse();

  const rows: Row[] = [];
  let id = 0;
  weeks.forEach((week) => {
    week.hits.forEach((hit) => {
      rows.push({ id: id++, week: week.week, hit: hit.task });
    });
  });

  const handleUpdate = async () => {
    setUpdateState("loading");
    setError(null);
    setProgressStep(null);
    try {
      const result = await updateResume({
        onProgress: (step) => setProgressStep(step),
      });
      if (result.success) {
        setGeneratedExperience(result.workExperience);
        setGeneratedSkills(result.softwareSkills);
        setUpdateState("preview");
      } else {
        setError(result.error.message);
        setUpdateState("idle");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update resume");
      setUpdateState("idle");
    }
  };

  const handleConfirm = async () => {
    if (!generatedExperience || !generatedSkills) return;
    setUpdateState("loading");
    setError(null);
    const result = await saveResume(generatedExperience, generatedSkills);
    if (result.success) {
      setWorkExperience(generatedExperience);
      setSoftwareSkills(generatedSkills);
      setGeneratedExperience(null);
      setGeneratedSkills(null);
      setUpdateState("idle");
    } else {
      setError(result.error || "Failed to save");
      setUpdateState("preview");
    }
  };

  const handleCancel = () => {
    setGeneratedExperience(null);
    setGeneratedSkills(null);
    setUpdateState("idle");
    setError(null);
  };

  return (
    <>
      <Typography variant="h4" sx={{ mb: 2 }}>
        Resume
      </Typography>

      {/* Buttons */}
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        {updateState === "idle" && (
          <Button variant="outlined" onClick={handleUpdate}>
            Update
          </Button>
        )}
        {updateState === "preview" && (
          <>
            <Button variant="contained" color="success" onClick={handleConfirm}>
              Confirm Update
            </Button>
            <Button variant="outlined" onClick={handleUpdate}>
              Retry Update
            </Button>
            <Button variant="outlined" color="error" onClick={handleCancel}>
              Cancel
            </Button>
          </>
        )}
      </Stack>

      {/* Progress indicator */}
      {updateState === "loading" && (
        <Box sx={{ mb: 2 }}>
          <LinearProgress
            variant="determinate"
            value={progressStep ? STEP_PROGRESS[progressStep] : 0}
            sx={{ mb: 1 }}
          />
          <Typography variant="body2" color="text.secondary">
            {progressStep ? STEP_LABELS[progressStep] : "Starting..."}
          </Typography>
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Typography variant="body2" sx={{ mb: 2, color: "text.secondary" }}>
        Last updated: {new Date(workExperience.updated).toLocaleDateString()}
      </Typography>

      {/* Work Experience */}
      <Typography variant="h5" sx={{ mb: 2 }}>
        Work Experience
      </Typography>

      {updateState === "preview" && generatedExperience ? (
        <Box sx={{ display: "flex", gap: 4, mb: 4 }}>
          <Box sx={{ flex: 1 }}>
            <Typography
              variant="subtitle2"
              sx={{ mb: 1, fontWeight: 700, color: "text.secondary" }}
            >
              Current
            </Typography>
            <List dense>
              {workExperience.experience.map((bullet, i) => (
                <ListItem key={i} sx={{ py: 0.5 }}>
                  <ListItemText primary={`• ${bullet}`} />
                </ListItem>
              ))}
            </List>
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography
              variant="subtitle2"
              sx={{ mb: 1, fontWeight: 700, color: "success.main" }}
            >
              Generated
            </Typography>
            <List dense>
              {generatedExperience.experience.map((bullet, i) => (
                <ListItem key={i} sx={{ py: 0.5 }}>
                  <ListItemText primary={`• ${bullet}`} />
                </ListItem>
              ))}
            </List>
          </Box>
        </Box>
      ) : (
        <List dense>
          {workExperience.experience.map((bullet, i) => (
            <ListItem key={i} sx={{ py: 0.5 }}>
              <ListItemText primary={`• ${bullet}`} />
            </ListItem>
          ))}
        </List>
      )}

      {/* Software Skills */}
      <Typography variant="h5" sx={{ mt: 4, mb: 2 }}>
        Software Skills
      </Typography>

      {updateState === "preview" && generatedSkills ? (
        <Box sx={{ display: "flex", gap: 4, mb: 4 }}>
          <Box sx={{ flex: 1 }}>
            <Typography
              variant="subtitle2"
              sx={{ mb: 1, fontWeight: 700, color: "text.secondary" }}
            >
              Current
            </Typography>
            {softwareSkills.categories.map((cat, i) => (
              <Box key={i} sx={{ mb: 2 }}>
                <Typography
                  variant="subtitle1"
                  sx={{ fontWeight: 700, color: "primary.main" }}
                >
                  {cat.category}
                </Typography>
                <Stack
                  direction="row"
                  sx={{ flexWrap: "wrap", gap: 1, mt: 0.5 }}
                >
                  {cat.skills.map((skill, j) => (
                    <Chip
                      key={j}
                      label={skill}
                      size="small"
                      variant="outlined"
                    />
                  ))}
                </Stack>
              </Box>
            ))}
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography
              variant="subtitle2"
              sx={{ mb: 1, fontWeight: 700, color: "success.main" }}
            >
              Generated
            </Typography>
            {generatedSkills.categories.map((cat, i) => (
              <Box key={i} sx={{ mb: 2 }}>
                <Typography
                  variant="subtitle1"
                  sx={{ fontWeight: 700, color: "primary.main" }}
                >
                  {cat.category}
                </Typography>
                <Stack
                  direction="row"
                  sx={{ flexWrap: "wrap", gap: 1, mt: 0.5 }}
                >
                  {cat.skills.map((skill, j) => (
                    <Chip
                      key={j}
                      label={skill}
                      size="small"
                      variant="outlined"
                    />
                  ))}
                </Stack>
              </Box>
            ))}
          </Box>
        </Box>
      ) : (
        softwareSkills.categories.map((cat, i) => (
          <Box key={i} sx={{ mb: 2 }}>
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: 700, color: "primary.main" }}
            >
              {cat.category}
            </Typography>
            <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1, mt: 0.5 }}>
              {cat.skills.map((skill, j) => (
                <Chip key={j} label={skill} size="small" variant="outlined" />
              ))}
            </Stack>
          </Box>
        ))
      )}

      <Button
        size="small"
        variant="outlined"
        sx={{ mt: 2 }}
        onClick={() => {
          const source =
            updateState === "preview" && generatedSkills
              ? generatedSkills
              : softwareSkills;
          const text = source.categories
            .map((c) => `${c.category}: ${c.skills.join(", ")}`)
            .join("\n");
          navigator.clipboard.writeText(text);
        }}
      >
        Copy Formatted
      </Button>

      <Typography variant="h4" sx={{ mt: 4, mb: 2 }}>
        View All Hits
      </Typography>
      <Box sx={{ my: 2, width: "100%" }}>
        <DataGrid
          rows={rows}
          columns={columns}
          initialState={{
            pagination: { paginationModel: { pageSize: 10 } },
          }}
          pageSizeOptions={[10, 25, 50, 100]}
        />
      </Box>
    </>
  );
}

export default ViewAllHits;
