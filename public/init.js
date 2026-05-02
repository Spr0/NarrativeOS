if (window.netlifyIdentity) {
  window.netlifyIdentity.init({
    APIUrl: "https://aicareerforge.netlify.app/.netlify/identity"
  });
  // The Identity widget's internal MobX component crashes on init when
  // user.full_name is undefined, leaving its overlay div blocking all clicks.
  // Force-closing after init dismisses the stuck overlay.
  window.netlifyIdentity.on("init", function() {
    window.netlifyIdentity.close();
  });
}
