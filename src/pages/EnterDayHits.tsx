import { Alert, Button, Stack, TextField, Typography } from "@mui/material";
import { useState } from "react";
import hitsData from "../data/hits.json";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

type DayOfWeek = (typeof DAYS)[number];

interface HitEntry {
  key: number;
  task: string;
  time: number;
}

/** Convert a date string (YYYY-MM-DD) to the week start format used in hits.json (M/D/YYYY for Saturday on or before that date) */
function getWeekStart(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const dayIndex = date.getDay(); // 0=Sun, 1=Mon, ... 6=Sat
  const saturdayOffset = dayIndex >= 6 ? 0 : -(dayIndex + 1);
  const saturday = new Date(date);
  saturday.setDate(date.getDate() + saturdayOffset);
  return `${saturday.getMonth() + 1}/${saturday.getDate()}/${saturday.getFullYear()}`;
}

/** Get the day of the week name from a date string */
function getDayName(dateStr: string): DayOfWeek {
  const date = new Date(dateStr + "T00:00:00");
  return DAYS[date.getDay() === 0 ? 6 : date.getDay() - 1];
}

function getDayHits(weekStr: string, dayName: DayOfWeek): HitEntry[] {
  const weekData = hitsData.find((w) => w.week === weekStr);
  if (!weekData) return [];
  const dayData = (weekData.days as Record<string, HitEntry[] | undefined>)[
    dayName
  ];
  return dayData ?? [];
}

function EnterDayHits() {
  const today = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [saveError, setSaveError] = useState("");

  const day = getDayName(selectedDate);
  const week = getWeekStart(selectedDate);

  const [hits, setHits] = useState<HitEntry[]>(getDayHits(week, day));

  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
    const newDay = getDayName(newDate);
    setHits(getDayHits(getWeekStart(newDate), newDay));
  };

  return (
    <>
      <Typography variant="h4" sx={{ mb: 2 }}>
        Enter Day Hits
      </Typography>
      <Typography variant="h6" sx={{ mb: 2 }}>
        {day} in the week of {week}
      </Typography>

      <Stack direction="row" sx={{ mb: 4, gap: 2, alignItems: "center" }}>
        <TextField
          label="Select date"
          type="date"
          value={selectedDate}
          onChange={(e) => handleDateChange(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{
            "& input": { colorScheme: "dark" },
          }}
        />

        {selectedDate !== today && (
          <Alert severity="warning">
            You are editing hits for a different day than today.
          </Alert>
        )}
      </Stack>

      {hits.map((hit) => (
        <div key={hit.key}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Hit {hit.key}
          </Typography>

          <Stack direction="row" sx={{ mb: 4, gap: 2 }}>
            <TextField
              label="Enter task"
              fullWidth
              value={hit.task}
              onChange={(value) =>
                setHits((prev) => {
                  return prev.map((h) =>
                    h.key === hit.key ? { ...h, task: value.target.value } : h,
                  );
                })
              }
            />

            <TextField
              label="Time spent (hours)"
              type="number"
              value={hit.time}
              onChange={(value) =>
                setHits((prev) => {
                  return prev.map((h) =>
                    h.key === hit.key
                      ? { ...h, time: parseFloat(value.target.value) }
                      : h,
                  );
                })
              }
            />

            <Button
              variant="outlined"
              color="error"
              onClick={() =>
                setHits((prev) =>
                  prev
                    .filter((h) => h.key !== hit.key)
                    .map((h, i) => ({ ...h, key: i + 1 })),
                )
              }
            >
              <DeleteIcon />
            </Button>
          </Stack>
        </div>
      ))}

      <Button
        variant="outlined"
        fullWidth
        size="large"
        color="success"
        onClick={() =>
          setHits((prev) => [
            ...prev,
            { key: prev.length + 1, task: "", time: 0 },
          ])
        }
        sx={{ my: 2 }}
      >
        <AddIcon />
      </Button>

      <Button
        variant="outlined"
        fullWidth
        size="large"
        onClick={async () => {
          setSaveStatus("saving");
          setSaveError("");
          try {
            const res = await fetch("/api/save-hits", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ week, day, hits }),
            });
            if (!res.ok) {
              const text = await res.text();
              setSaveStatus("error");
              setSaveError(text);
            } else {
              setSaveStatus("saved");
              setTimeout(() => setSaveStatus("idle"), 2000);
            }
          } catch (e: any) {
            setSaveStatus("error");
            setSaveError(e.message);
          }
        }}
        sx={{ my: 2 }}
      >
        Save
      </Button>

      {saveStatus === "saving" && (
        <Alert severity="info" sx={{ mt: 1 }}>
          Saving....
        </Alert>
      )}
      {saveStatus === "saved" && (
        <Alert severity="success" sx={{ mt: 1 }}>
          Saved
        </Alert>
      )}
      {saveStatus === "error" && (
        <Alert severity="error" sx={{ mt: 1 }}>
          Failed to save{saveError ? `: ${saveError}` : ""}
        </Alert>
      )}
    </>
  );
}

export default EnterDayHits;
