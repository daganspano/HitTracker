import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import EnterDayHits from "./pages/EnterDayHits";
import SubmitWeeklyHits from "./pages/SubmitWeeklyHits";
import ViewAllHits from "./pages/ViewAllHits";
import Layout from "./components/Layout";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route element={<Layout />}>
        <Route path="/enter-day-hits" element={<EnterDayHits />} />
        <Route path="/submit-weekly-hits" element={<SubmitWeeklyHits />} />
        <Route path="/view-all-hits" element={<ViewAllHits />} />
      </Route>
    </Routes>
  );
}

export default App;
