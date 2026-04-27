import Header from "./Header.jsx";
import Footer from "./Footer.jsx";
import MobileDock from "./MobileDock.jsx";
import CompareTray from "./CompareTray.jsx";

export default function Layout({
  children,
  currentRoute,
  onNavigate,
  appActions,
}) {
  return (
    <div className="app-shell">
      <Header
        currentRoute={currentRoute}
        onNavigate={onNavigate}
        appActions={appActions}
      />

      <main className="app-main">{children}</main>

      <Footer onNavigate={onNavigate} />

      <CompareTray appActions={appActions} onNavigate={onNavigate} />

      <MobileDock
        currentRoute={currentRoute}
        onNavigate={onNavigate}
        appActions={appActions}
      />
    </div>
  );
}