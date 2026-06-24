type SettingProps = {
  //   item: Item;
  //   itemId: string;
  //   isExpanded: boolean;
  //   onToggleExpanded: (slotId: string) => void;
  //   onDeleteItem: (slotId: string) => void;
  //   onDragHandlePointerDown: () => void;
};

function ClipSetting(
  {
    //   item,
    //   itemId,
    //   isExpanded,
    //   onToggleExpanded,
    //   onDeleteItem,
    //   onDragHandlePointerDown,
  }: SettingProps,
) {
  return (
    <div>
      {/* <div className="bg-amber-600"> */}

      <form>
        <input className="w-70 border-b-2 px-1" placeholder="Video title..." />
        <button type="submit">
          <p className="font-bold bg-slate-500 rounded-2xl">UPDATE</p>
        </button>
      </form>
      {/* </div> */}
    </div>
  );
}
export default ClipSetting;
