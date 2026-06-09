import { AppBar, Toolbar, Button, Box } from "@mui/material";
import { useNavigate } from "react-router-dom";
import HomeIcon from "@mui/icons-material/Home";

const navItems = [
  { label: "Home", path: "/" },
  { label: "Enter Day Hits", path: "/enter-day-hits" },
  { label: "Submit Weekly Hits", path: "/submit-weekly-hits" },
  { label: "View All Hits", path: "/view-all-hits" },
];

function Navbar() {
  const navigate = useNavigate();

  return (
    <AppBar position="fixed" sx={{ bgcolor: "background.paper" }}>
      <Toolbar>
        <Button
          startIcon={<HomeIcon />}
          onClick={() => navigate("/")}
          sx={{ color: "primary.main", mr: 2 }}
        >
          Home
        </Button>
        <Box sx={{ display: "flex", gap: 1 }}>
          {navItems.slice(1).map((item) => (
            <Button
              key={item.path}
              onClick={() => navigate(item.path)}
              sx={{ color: "text.primary" }}
            >
              {item.label}
            </Button>
          ))}
        </Box>
      </Toolbar>
    </AppBar>
  );
}

export default Navbar;
