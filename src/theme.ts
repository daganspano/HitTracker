import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#ff9800",
    },
    secondary: {
      main: "#42a5f5",
    },
    background: {
      default: "#121212",
      paper: "#1e1e1e",
    },
  },
  typography: {
    fontFamily: '"Montserrat", "Roboto", "Helvetica", "Arial", sans-serif',
    fontWeightRegular: 500,
    fontWeightBold: 800,
    h2: {
      fontWeight: 900,
      letterSpacing: "-0.02em",
      textTransform: "uppercase",
    },
    h4: {
      fontWeight: 700,
    },
    h6: {
      fontWeight: 700,
    },
    button: {
      fontWeight: 700,
      letterSpacing: "0.02em",
    },
  },
});

export default theme;
