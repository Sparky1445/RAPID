import React from 'react';
import useWebSocket from '../store/useWebSocket';
import TopCommandBar from '../components/header/TopCommandBar';
import LeftSidebar from '../components/sidebar/LeftSidebar';
import RapidMap from '../components/map/RapidMap';
import MissionControlPanel from '../components/mission-control/MissionControlPanel';
import ManualIncidentModal from '../components/modals/ManualIncidentModal';
import OverrideModal from '../components/modals/OverrideModal';

// A thin composition shell. All state lives in store/rapidStore.js; the map,
// side panels and modals are independently testable components.
function Dashboard() {
  useWebSocket();

  // The operations view is the one page that runs edge to edge, so it cancels
  // the padding <main> puts on every other page. The negative margins have to
  // match that padding at each breakpoint or the page scrolls sideways: main
  // is px-4 pt-16 pb-8 on mobile and px-8 pt-8 pb-8 from lg up.
  return (
    <div className="flex flex-col lg:h-[calc(100vh-4rem)] lg:overflow-hidden text-text relative -mx-4 -mt-16 -mb-8 lg:-mx-8 lg:-mt-8">
      <TopCommandBar />

      {/* Three panes side by side only from lg up. Narrower than that they
          stack, map first, because a 100px-wide incident list is not a list. */}
      <div className="flex flex-col lg:grid lg:grid-cols-12 flex-1 min-h-0 bg-page">
        <LeftSidebar />
        <RapidMap />
        <MissionControlPanel />
      </div>

      <ManualIncidentModal />
      <OverrideModal />
    </div>
  );
}

export default Dashboard;
