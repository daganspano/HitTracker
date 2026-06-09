import { Box, Typography, Card, CardActionArea } from "@mui/material";
import { useNavigate } from "react-router-dom";
import EditNoteIcon from "@mui/icons-material/EditNote";
import SendIcon from "@mui/icons-material/Send";
import ViewListIcon from "@mui/icons-material/ViewList";

const panels = [
  {
    label: "Enter Day Hits",
    path: "/enter-day-hits",
    icon: EditNoteIcon,
  },
  {
    label: "Submit Weekly Hits",
    path: "/submit-weekly-hits",
    icon: SendIcon,
  },
  {
    label: "View All Hits",
    path: "/view-all-hits",
    icon: ViewListIcon,
  },
];

function Home() {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        gap: 6,
      }}
    >
      <Typography variant="h2" sx={{ fontWeight: 700, color: "primary.main" }}>
        Hit Tracker
      </Typography>
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          gap: 4,
        }}
      >
        {panels.map((panel) => (
          <Card
            key={panel.path}
            sx={{
              width: 220,
              bgcolor: "background.paper",
              border: 1,
              borderColor: "primary.main",
              transition:
                "transform 0.2s ease, border-color 0.2s ease, background-color 0.2s ease",
              "&:hover": {
                transform: "translateY(-4px)",
                borderColor: "primary.light",
                bgcolor: (theme) =>
                  theme.palette.mode === "dark"
                    ? "rgba(144, 202, 249, 0.08)"
                    : "rgba(25, 118, 210, 0.04)",
                "& .MuiSvgIcon-root": {
                  color: "primary.light",
                },
                "& .MuiTypography-root": {
                  color: "primary.light",
                },
              },
            }}
          >
            <CardActionArea
              onClick={() => navigate(panel.path)}
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                py: 5,
                px: 3,
                gap: 2,
                "& .MuiCardActionArea-focusHighlight": {
                  background: "transparent",
                },
              }}
            >
              <panel.icon
                sx={{
                  fontSize: 48,
                  color: "primary.main",
                  transition: "color 0.2s ease",
                }}
              />
              <Typography
                variant="h6"
                sx={{ color: "text.primary", textAlign: "center" }}
              >
                {panel.label}
              </Typography>
            </CardActionArea>
          </Card>
        ))}
      </Box>
    </Box>
  );
}

export default Home;
