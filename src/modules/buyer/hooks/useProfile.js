import { useEffect, useState } from "react";
import { updateBuyerProfile } from "../../../services/profiles.service.js";

export function useProfile(authUser, authProfile, appActions) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    fullName: authProfile?.full_name || "",
    phoneVisible: authProfile?.phone_visible || "",
    phoneWhatsapp: authProfile?.phone_whatsapp || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setForm({
      fullName: authProfile?.full_name || "",
      phoneVisible: authProfile?.phone_visible || "",
      phoneWhatsapp: authProfile?.phone_whatsapp || "",
    });
  }, [authProfile?.full_name, authProfile?.phone_visible, authProfile?.phone_whatsapp]);

  function updateField(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function startEditing() {
    setEditing(true);
    setError("");
  }

  function cancelEditing() {
    setEditing(false);
    setError("");
  }

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);

    const { error: saveError } = await updateBuyerProfile({
      fullName: form.fullName,
      phoneVisible: form.phoneVisible,
      phoneWhatsapp: form.phoneWhatsapp,
    });

    if (saveError) {
      setError(saveError.message || "No se pudo guardar el perfil.");
      setSaving(false);
      return;
    }

    setSaved(true);
    setSaving(false);
    setEditing(false);
    appActions?.refreshAuthProfile?.();
    window.setTimeout(() => setSaved(false), 1800);
  }

  return {
    editing,
    form,
    saving,
    error,
    saved,
    updateField,
    startEditing,
    cancelEditing,
    save,
  };
}
