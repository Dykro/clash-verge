import useSWR, { mutate } from "swr";
import { useMemo, useRef, useState } from "react";
import { useLockFn } from "ahooks";
import { useSetRecoilState } from "recoil";
import { Box, Button, Grid, IconButton, Stack, TextField } from "@mui/material";
import {
  LocalFireDepartmentRounded,
  RefreshRounded,
  TextSnippetOutlined,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import {
  getProfiles,
  importProfile,
  enhanceProfiles,
  getRuntimeLogs,
  deleteProfile,
  updateProfile,
} from "@/services/cmds";
import { atomLoadingCache } from "@/services/states";
import { closeAllConnections } from "@/services/api";
import { BasePage, DialogRef, Notice } from "@/components/base";
import {
  ProfileViewer,
  ProfileViewerRef,
} from "@/components/profile2/profile-viewer";
import { ProfileItem } from "@/components/profile2/profile-item";
import { ProfileMore } from "@/components/profile2/profile-more";
import { useProfiles } from "@/hooks/use-profiles";
import { ConfigViewer } from "@/components/setting/mods/config-viewer";
import { throttle } from "lodash-es";
import { readText } from '@tauri-apps/api/clipboard';



const url2  = await readText();
const ProfilePage2 = () => {
  const { t } = useTranslation();

  const [url, setUrl] = useState("");
  const [disabled, setDisabled] = useState(false);

  const {
    profiles = {},
    activateSelected,
    patchProfiles,
    mutateProfiles,
  } = useProfiles();
  const { data: chainLogs = {}, mutate: mutateLogs } = useSWR(
    "getRuntimeLogs",
    getRuntimeLogs
  );

  const chain = profiles.chain || [];
  const viewerRef = useRef<ProfileViewerRef>(null);
  const configRef = useRef<DialogRef>(null);

  // distinguish type
  const { regularItems, enhanceItems } = useMemo(() => {
    const items = profiles.items || [];
    const chain = profiles.chain || [];

    const type1 = ["local", "remote"];
    const type2 = ["merge", "script"];

    const regularItems = items.filter((i) => type1.includes(i.type!));
    const restItems = items.filter((i) => type2.includes(i.type!));
    const restMap = Object.fromEntries(restItems.map((i) => [i.uid, i]));
    const enhanceItems = chain
      .map((i) => restMap[i]!)
      .concat(restItems.filter((i) => !chain.includes(i.uid)));

    return { regularItems, enhanceItems };
  }, [profiles]);

  

  const onImport = async () => {

    const url  = await readText();
    if (!url) return;
    setUrl("");
    setDisabled(true);

    try {
      await importProfile(url);
      Notice.success("Successfully import profile.");

      getProfiles().then((newProfiles) => {
        mutate("getProfiles", newProfiles);

        const remoteItem = newProfiles.items?.find((e) => e.type === "remote");
        if (!newProfiles.current && remoteItem) {
          const current = remoteItem.uid;
          patchProfiles({ current });
          mutateLogs();
          setTimeout(() => activateSelected(), 2000);
        }
      });
    } catch (err: any) {
      Notice.error(err.message || err.toString());
    } finally {
      setDisabled(false);
    }
  };





  const onSelect = useLockFn(async (current: string, force: boolean) => {
    if (!force && current === profiles.current) return;
    try {
      await patchProfiles({ current });
      mutateLogs();
      closeAllConnections();
      setTimeout(() => activateSelected(), 2000);
      Notice.success("Refresh clash config", 1000);
    } catch (err: any) {
      Notice.error(err?.message || err.toString(), 4000);
    }
  });

  const onEnhance = useLockFn(async () => {
    try {
      await enhanceProfiles();
      mutateLogs();
      Notice.success("Refresh clash config", 1000);
    } catch (err: any) {
      Notice.error(err.message || err.toString(), 3000);
    }
  });

  const onEnable = useLockFn(async (uid: string) => {
    if (chain.includes(uid)) return;
    const newChain = [...chain, uid];
    await patchProfiles({ chain: newChain });
    mutateLogs();
  });

  const onDisable = useLockFn(async (uid: string) => {
    if (!chain.includes(uid)) return;
    const newChain = chain.filter((i) => i !== uid);
    await patchProfiles({ chain: newChain });
    mutateLogs();
  });

  const onDelete = useLockFn(async (uid: string) => {
    try {
      await onDisable(uid);
      await deleteProfile(uid);
      mutateProfiles();
      mutateLogs();
    } catch (err: any) {
      Notice.error(err?.message || err.toString());
    }
  });

  const onMoveTop = useLockFn(async (uid: string) => {
    if (!chain.includes(uid)) return;
    const newChain = [uid].concat(chain.filter((i) => i !== uid));
    await patchProfiles({ chain: newChain });
    mutateLogs();
  });

  const onMoveEnd = useLockFn(async (uid: string) => {
    if (!chain.includes(uid)) return;
    const newChain = chain.filter((i) => i !== uid).concat([uid]);
    await patchProfiles({ chain: newChain });
    mutateLogs();
  });

  // 更新所有配置
  const setLoadingCache = useSetRecoilState(atomLoadingCache);
  const onUpdateAll = useLockFn(async () => {
    const throttleMutate = throttle(mutateProfiles, 2000, {
      trailing: true,
    });
    const updateOne = async (uid: string) => {
      try {
        await updateProfile(uid);
        throttleMutate();
      } finally {
        setLoadingCache((cache) => ({ ...cache, [uid]: false }));
      }
    };

    return new Promise((resolve) => {
      setLoadingCache((cache) => {
        // 获取没有正在更新的配置
        const items = regularItems.filter(
          (e) => e.type === "remote" && !cache[e.uid]
        );
        const change = Object.fromEntries(items.map((e) => [e.uid, true]));

        Promise.allSettled(items.map((e) => updateOne(e.uid))).then(resolve);
        return { ...cache, ...change };
      });
    });
  });
  const ac1 = 1;
  const currentid = regularItems.find((obj) => {
    return obj.uid === profiles.current;
  }) ?? {uid: '',type: 'local',name: '请添加订阅',file: '',url: '请导入链接',extra:{upload: 0,download: 0,total: 0,expire: 0},updated: 0};
  return (
    <div>
      <Box sx={{ mb: 0 ,mt:0 }}>
        <Grid container spacing={{ xs: 12}}>
            <Grid item xs={12} key={currentid?.file}>
              <ProfileItem
                selected={1 !== ac1}
                itemData={currentid}
                onSelect={(f) => onSelect(currentid.uid, f)}
                onEdit={() => viewerRef.current?.edit(currentid)}
              />
            </Grid>
        </Grid>
      </Box>

      {enhanceItems.length > 0 && (
        <Grid container spacing={{ xs: 12}}>
          {enhanceItems.map((item) => (
            <Grid item xs={12} key={item.file}>
              <ProfileMore
                selected={!!chain.includes(item.uid)}
                itemData={item}
                enableNum={chain.length || 0}
                logInfo={chainLogs[item.uid]}
                onEnable={() => onEnable(item.uid)}
                onDisable={() => onDisable(item.uid)}
                onDelete={() => onDelete(item.uid)}
                onMoveTop={() => onMoveTop(item.uid)}
                onMoveEnd={() => onMoveEnd(item.uid)}
                onEdit={() => viewerRef.current?.edit(item)}
              />
            </Grid>
          ))}
        </Grid>
      )}

      <ProfileViewer ref={viewerRef} onChange={() => mutateProfiles()} />
      <ConfigViewer ref={configRef} />
    </div>
  );
};

export default ProfilePage2;
