import { Box, Toolbar } from "@mui/material";
import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";

function Layout() {
  return (
    <Box>
      <Navbar />
      <Toolbar />
      <Box sx={{ p: 4, maxWidth: "60rem", mx: "auto" }}>
        <Outlet />
      </Box>
    </Box>
  );
}

export default Layout;
