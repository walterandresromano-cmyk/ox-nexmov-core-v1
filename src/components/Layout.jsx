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
  const showGlobalNotice =
    appActions?.appNotice &&
    !(
      appActions.appNotice.scope === "compare" &&
      appActions.compareItems?.length > 0
    );

  return (
    <div className="app-shell">
      <Header
        currentRoute={currentRoute}
        onNavigate={onNavigate}
        appActions={appActions}
      />

      <main className="app-main">{children}</main>

      <Footer onNavigate={onNavigate} />

      {showGlobalNotice && (
        <div className={`app-notice app-notice--${appActions.appNotice.tone || "info"}`}>
          <span>{appActions.appNotice.message}</span>
          <button type="button" onClick={appActions.dismissAppNotice}>
            Cerrar
          </button>
        </div>
      )}

      <CompareTray appActions={appActions} onNavigate={onNavigate} />

      <MobileDock
        currentRoute={currentRoute}
        onNavigate={onNavigate}
        appActions={appActions}
      />
    </div>
  );
}
