import SocketFacade from "../core/api/app-server/SocketFacade";
import { Permission, StoreObj, StoreUseData } from "@/@types/store";
import {
  SceneAndLayer,
  SceneLayer,
  Scene,
  UserData,
  ActorGroup,
  SceneAndObject,
  RoomData,
  SocketUserData,
  CutInDeclareInfo,
  ImageInfo,
  PartialRoomData
} from "@/@types/room";
import { ApplicationError } from "@/app/core/error/ApplicationError";
import {
  ExtraStore,
  SceneObject,
  PropertyFaceStore,
  PropertySelectionStore,
  PropertyStore,
  TagNoteStore,
  ActorStatusStore
} from "@/@types/gameObject";
import {
  ClientRoomInfo,
  RoomInfoExtend,
  WindowSettings
} from "@/@types/socket";
import DocumentSnapshot from "nekostore/lib/DocumentSnapshot";
import { Point } from "address";
import { createPoint } from "@/app/core/Coordinate";
import { BgmStandByInfo } from "task-info";
import LanguageManager from "@/LanguageManager";
import { getSrc } from "@/app/core/Utility";

export default class GameObjectManager {
  // シングルトン
  public static get instance(): GameObjectManager {
    if (!GameObjectManager._instance)
      GameObjectManager._instance = new GameObjectManager();
    return GameObjectManager._instance;
  }

  private static _instance: GameObjectManager;
  public static readonly DEFAULT_PERMISSION: Permission = {
    view: {
      type: "none",
      list: []
    },
    edit: {
      type: "none",
      list: []
    },
    chmod: {
      type: "none",
      list: []
    }
  };

  // コンストラクタの隠蔽
  private constructor() {}

  private async initialize() {
    const sf = SocketFacade.instance;
    await sf.sceneListCC().getList(true, this.sceneList);
    await sf.imageDataCC().getList(true, this.imageList);
    await sf.imageTagCC().getList(true, this.imageTagList);
    await sf.userCC().getList(true, this.userList);
    await sf.cutInDataCC().getList(true, this.cutInList);
    await sf.socketUserCC().getList(true, this.socketUserList);
    await sf.extraCC().getList(true, this.extraList);
    await sf.propertyFaceCC().getList(true, this.propertyFaceList);
    await sf.propertyCC().getList(true, this.propertyList);
    await sf.sceneLayerCC().getList(true, this.sceneLayerList);
    await sf.sceneAndLayerCC().getList(true, this.sceneAndLayerList);
    await sf.sceneAndObjectCC().getList(true, this.sceneAndObjectList);
    await sf.sceneObjectCC().getList(true, this.sceneObjectList);
    await sf.actorStatusCC().getList(true, this.actorStatusList);
    await sf.propertySelectionCC().getList(true, this.propertySelectionList);
    await sf.tagNoteCC().getList(true, this.tagNoteList);
    await sf.actorGroupCC().getList(true, this.actorGroupList);

    const roomDataCC = sf.roomDataCC();
    const roomData = (await roomDataCC.getList(false))[0];
    this.roomDataId = roomData.id!;

    // Object.assign()
    const writeSettings = (from: RoomInfoExtend, to: RoomInfoExtend) => {
      to.visitable = from.visitable;
      to.isFitGrid = from.isFitGrid;
      to.isViewDice = from.isViewDice;
      to.isViewCutIn = from.isViewCutIn;
      to.isDrawGridId = from.isDrawGridId;
      to.mapRotatable = from.mapRotatable;
      to.isDrawGridLine = from.isDrawGridLine;
      to.isShowStandImage = from.isShowStandImage;
      to.isShowRotateMarker = from.isShowRotateMarker;
      to.windowSettings.chat = from.windowSettings.chat;
      to.windowSettings.resource = from.windowSettings.resource;
      to.windowSettings.initiative = from.windowSettings.initiative;
      to.windowSettings.chatPalette = from.windowSettings.chatPalette;
      to.windowSettings.counterRemocon = from.windowSettings.counterRemocon;
    };
    this.roomData.sceneId = roomData.data!.sceneId;
    writeSettings(roomData.data!.settings, this.roomData.settings);

    await roomDataCC.setSnapshot(
      "GameObjectManager",
      this.roomDataId,
      (snapshot: DocumentSnapshot<StoreObj<RoomData>>) => {
        if (snapshot.exists() && snapshot.data.status === "modified") {
          const d = snapshot.data.data!;
          // Object.assign()
          this.roomData.sceneId = d.sceneId;
          writeSettings(d.settings, this.roomData.settings);
        }
      }
    );

    // 画像のプリロード
    this.imageList.forEach(image => {
      const src = getSrc(image.data!.data);
      if (!src.startsWith("data")) {
        const imgElm = document.createElement("img");
        imgElm.src = src;
      }
    });
  }

  public async updateRoomData(data: PartialRoomData): Promise<void> {
    if (!this.roomDataId)
      throw new ApplicationError("Illegal timing error(roomDataId is null).");
    const cc = SocketFacade.instance.roomDataCC();

    try {
      await cc.touchModify(this.roomDataId);
    } catch (err) {
      // nothing.
      window.console.error(err);
      return;
    }

    // Object.assign()
    if (data.sceneId !== undefined) this.roomData.sceneId = data.sceneId;
    const settings = data.settings;
    if (settings) {
      const copyParam = <T extends keyof RoomInfoExtend>(param: T) => {
        if (settings[param] !== undefined)
          this.roomData.settings[param] = settings[param];
      };
      copyParam("visitable");
      copyParam("isFitGrid");
      copyParam("isViewDice");
      copyParam("isViewCutIn");
      copyParam("isDrawGridId");
      copyParam("mapRotatable");
      copyParam("isDrawGridLine");
      copyParam("isShowStandImage");
      copyParam("isShowRotateMarker");

      const windowSettings = settings.windowSettings;
      if (windowSettings) {
        const copyWindow = <T extends keyof WindowSettings>(param: T) => {
          if (windowSettings[param] !== undefined)
            this.roomData.settings.windowSettings[param] =
              windowSettings[param];
        };
        copyWindow("chat");
        copyWindow("resource");
        copyWindow("initiative");
        copyWindow("chatPalette");
        copyWindow("counterRemocon");
      }
    }
    await cc.update(this.roomDataId, this.roomData);
  }

  private __clientRoomInfo: ClientRoomInfo | null = null;
  public isSceneEditing: boolean = false;
  // シーンの編集中にシーンの切り替えが行われたとき、その追従を行うための変数
  public sceneEditingUpdateSceneId: string | null = null;
  private roomDataId: string | null = null;
  public readonly roomData: RoomData = {
    sceneId: "",
    settings: {
      visitable: true,
      isFitGrid: true,
      isViewDice: true,
      isViewCutIn: true,
      isDrawGridId: true,
      mapRotatable: true,
      isDrawGridLine: true,
      isShowStandImage: true,
      isShowRotateMarker: true,
      windowSettings: {
        chat: "free",
        resource: "free",
        initiative: "free",
        chatPalette: "free",
        counterRemocon: "free"
      }
    }
  };
  public readonly playingBgmList: {
    targetId: string | null;
    tag: string;
    windowKey: string;
  }[] = [];
  public readonly throwEndPoint: Point = createPoint(0, 0);
  public sceneList: StoreUseData<Scene>[] = [];
  public cutInList: StoreUseData<CutInDeclareInfo>[] = [];
  public bgmStandByList: StoreUseData<BgmStandByInfo>[] = [];
  public imageList: StoreUseData<ImageInfo>[] = [];
  public imageTagList: StoreUseData<string>[] = [];
  public userList: StoreUseData<UserData>[] = [];
  public socketUserList: StoreUseData<SocketUserData>[] = [];
  public extraList: StoreUseData<ExtraStore>[] = [];
  public propertyFaceList: StoreUseData<PropertyFaceStore>[] = [];
  public sceneLayerList: StoreUseData<SceneLayer>[] = [];
  public sceneAndLayerList: StoreUseData<SceneAndLayer>[] = [];
  public sceneAndObjectList: StoreUseData<SceneAndObject>[] = [];
  public sceneObjectList: StoreUseData<SceneObject>[] = [];
  public actorStatusList: StoreUseData<ActorStatusStore>[] = [];
  public propertyList: StoreUseData<PropertyStore>[] = [];
  public propertySelectionList: StoreUseData<PropertySelectionStore>[] = [];
  public tagNoteList: StoreUseData<TagNoteStore>[] = [];
  public actorGroupList: StoreUseData<ActorGroup>[] = [];

  public get clientRoomInfo(): ClientRoomInfo {
    if (!this.__clientRoomInfo) {
      throw new ApplicationError(
        `Unsupported operation. clientRoomInfo is null.`
      );
    }
    return this.__clientRoomInfo;
  }

  public getExclusionOwnerId(socketId: string | null): string | null {
    const socketUserInfo = this.socketUserList.filter(
      su => su.data!.socketId === socketId
    )[0];
    if (!socketUserInfo) return null;
    return socketUserInfo.data!.userId;
  }

  public getExclusionOwnerName(socketId: string): string {
    const userId = this.getExclusionOwnerId(socketId);
    const userInfo = this.userList.filter(u => u.id === userId)[0];
    return !userInfo
      ? LanguageManager.instance.getText("label.unknown")
      : userInfo.data!.userName;
  }

  public async setClientRoomInfo(info: ClientRoomInfo) {
    this.__clientRoomInfo = info;
    await this.initialize();
  }

  public async addScene(
    scene: Scene
  ): Promise<{ sceneId: string; mapAndLayerIdList: string[] }> {
    /* --------------------------------------------------
     * シーンの登録
     */
    const sceneListCC = SocketFacade.instance.sceneListCC();
    const sceneId = (await sceneListCC.addDirect([scene]))[0];

    /* --------------------------------------------------
     * シーンとレイヤーの紐づきの登録
     */
    const sceneLayerCC = SocketFacade.instance.sceneLayerCC();
    const sceneAndLayerList: SceneAndLayer[] = (
      await sceneLayerCC.getList(false)
    ).map(sl => ({
      sceneId,
      layerId: sl.id!,
      isUse: true
    }));

    const sceneAndLayerCC = SocketFacade.instance.sceneAndLayerCC();
    const mapAndLayerIdList: string[] = await sceneAndLayerCC.addDirect(
      sceneAndLayerList
    );

    /* --------------------------------------------------
     * シーンとオブジェクトの紐づきの登録
     */
    const sceneObjectCC = SocketFacade.instance.sceneObjectCC();
    const sceneAndObjectList: SceneAndObject[] = (
      await sceneObjectCC.getList(false)
    ).map(so => ({
      sceneId,
      objectId: so.id!,
      isOriginalAddress: false,
      originalAddress: null,
      entering: "normal"
    }));

    const sceneAndObjectCC = SocketFacade.instance.sceneAndObjectCC();
    await sceneAndObjectCC.addDirect(sceneAndObjectList);

    return {
      sceneId,
      mapAndLayerIdList
    };
  }

  public async addSceneLayer(sceneLayer: SceneLayer): Promise<void> {
    const sceneLayerCC = SocketFacade.instance.sceneLayerCC();
    const layerId = (await sceneLayerCC.addDirect([sceneLayer]))[0];

    const sceneListCC = SocketFacade.instance.sceneListCC();
    const sceneAndLayerList: SceneAndLayer[] = (
      await sceneListCC.getList(false)
    ).map((s: StoreUseData<Scene>) => ({
      sceneId: s.id!,
      layerId,
      isUse: true
    }));

    const sceneAndLayerCC = SocketFacade.instance.sceneAndLayerCC();
    await sceneAndLayerCC.addDirect(sceneAndLayerList);
  }

  public async addSceneObject(sceneObject: SceneObject) {
    const sceneObjectCC = SocketFacade.instance.sceneObjectCC();
    const objectId = (await sceneObjectCC.addDirect([sceneObject]))[0];

    const sceneAndObjectList: SceneAndObject[] = this.sceneList.map(s => ({
      sceneId: s.id!,
      objectId,
      isOriginalAddress: false,
      originalAddress: null,
      entering: "normal"
    }));

    const sceneAndObjectCC = SocketFacade.instance.sceneAndObjectCC();
    await sceneAndObjectCC.addDirect(sceneAndObjectList);
  }

  public async deleteSceneObject(id: string) {
    const sceneAndObjectIdList: string[] = [];
    const touchedList: string[] = [];
    let error: boolean = false;

    const sceneAndObjectCC = SocketFacade.instance.sceneAndObjectCC();
    this.sceneList.forEach(async s => {
      const sceneId = s.id!;
      this.sceneAndLayerList
        .filter(sao => sao.id === sceneId)
        .forEach(async sao => {
          sceneAndObjectIdList.push(sao.id!);
        });
    });

    const releaseTouchModifyFunc = async (id: string): Promise<void> => {
      await sceneAndObjectCC!.releaseTouch(id);
    };
    const touchModifyFunc = async (id: string): Promise<void> => {
      if (error) return;
      try {
        await sceneAndObjectCC!.touchModify(id);
        touchedList.push(id);
      } catch (err) {
        error = true;

        // 直列の非同期で全部実行する
        await touchedList
          .map((id: string) => () => releaseTouchModifyFunc(id))
          .reduce((prev, curr) => prev.then(curr), Promise.resolve());
      }
    };

    // 直列の非同期で全部実行する
    await sceneAndObjectIdList
      .map((id: string) => () => touchModifyFunc(id))
      .reduce((prev, curr) => prev.then(curr), Promise.resolve());

    const sceneObjectCC = SocketFacade.instance.sceneObjectCC();
    try {
      await sceneObjectCC!.touchModify(id);
    } catch (err) {
      window.console.warn(err);
      error = true;

      // 直列の非同期で全部実行する
      await touchedList
        .map((id: string) => () => releaseTouchModifyFunc(id))
        .reduce((prev, curr) => prev.then(curr), Promise.resolve());
    }

    if (error) {
      alert(
        "Failure to delete object.\nAny data is locked.\nPlease try again latter."
      );
      return;
    }

    await sceneObjectCC!.delete(id);
    const deleteFunc = async (id: string): Promise<void> => {
      await sceneAndObjectCC!.delete(id);
    };
    // 直列の非同期で全部実行する
    touchedList
      .map((id: string) => () => deleteFunc(id))
      .reduce((prev, curr) => prev.then(curr), Promise.resolve());
  }

  public get mySelf(): StoreUseData<UserData> | null {
    return this.userList.filter(p => p.id === this.mySelfId)[0] || null;
  }

  public get isGm(): boolean {
    return (
      !!this.mySelf && !!this.mySelf.data && this.mySelf.data.userType === "GM"
    );
  }

  public get mySelfId(): string {
    const userId = SocketFacade.instance.userId;
    if (!userId) {
      throw new ApplicationError(`Illegal timing error.`);
    }
    return userId;
  }

  public getList(type: string): StoreUseData<unknown>[] | null {
    switch (type) {
      case "scene":
        return this.sceneList;
      case "image":
        return this.imageList;
      case "image-tag":
        return this.imageTagList;
      case "bgm-stand-by":
        return this.bgmStandByList;
      case "user":
        return this.userList;
      case "socket-user":
        return this.socketUserList;
      case "map-mask":
      case "chit":
      case "floor-tile":
      case "dice-symbol":
      case "character":
        return this.sceneObjectList;
      case "actor-status":
        return this.actorStatusList;
      case "extra":
        return this.extraList;
      case "property-face":
        return this.propertyFaceList;
      case "scene-layer":
        return this.sceneLayerList;
      case "scene-and-layer":
        return this.sceneAndLayerList;
      case "scene-and-object":
        return this.sceneAndObjectList;
      case "property":
        return this.propertyList;
      case "property-selection":
        return this.propertySelectionList;
      case "tag-note":
        return this.tagNoteList;
      case "actor-group":
        return this.actorGroupList;
    }
    return null;
  }
}
