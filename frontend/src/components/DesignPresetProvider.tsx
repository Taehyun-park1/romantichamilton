import { useEffect } from 'react';
import {
  applyDesignPreset,
  type SiteDesignPresetId,
} from '@/lib/designPresets';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

interface DesignPresetUpdatedEvent extends Event {
  detail?: {
    presetId?: SiteDesignPresetId;
  };
}

export default function DesignPresetProvider() {
  useEffect(() => {
    let mounted = true;

    applyDesignPreset('default');

    const loadActivePreset = async () => {
      if (!supabase || !isSupabaseConfigured) return;

      const { data, error } = await supabase
        .from('site_design_settings')
        .select('preset_id')
        .eq('id', 'active')
        .maybeSingle();

      if (!mounted || error || !data?.preset_id) return;

      applyDesignPreset(data.preset_id as SiteDesignPresetId);
    };

    const handlePresetUpdated = (event: Event) => {
      const presetEvent = event as DesignPresetUpdatedEvent;
      applyDesignPreset(presetEvent.detail?.presetId ?? 'default');
    };

    window.addEventListener('site-design-preset-updated', handlePresetUpdated);
    void loadActivePreset();

    return () => {
      mounted = false;
      window.removeEventListener(
        'site-design-preset-updated',
        handlePresetUpdated
      );
    };
  }, []);

  return null;
}
