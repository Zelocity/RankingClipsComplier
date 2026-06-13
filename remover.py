from pathlib import Path
import shutil

def remove_video(video_path: str) -> None:
    video = Path(video_path)

    if not video.exists():
        print(f"Video does not exist: {video}")
        return

    if not video.is_file():
        print(f"This is not a file: {video}")
        return

    video.unlink()
    print(f"Deleted video: {video}")


def remove_folder(folder_path: str) -> None:
    folder = Path(folder_path)

    if not folder.exists():
        print(f"Folder does not exist: {folder}")
        return

    if not folder.is_dir():
        print(f"Not a folder: {folder}")
        return

    for item in folder.iterdir():
        if item.is_file():
            remove_video(str(item))
        elif item.is_dir():
            shutil.rmtree(item)
            print(f"Deleted folder: {item}")

def remove_project() -> None:
    folders_to_clean = [
        "input",
        "output"
    ]

    confirm = input("This will delete files in input/ and output/. Continue? (y/n): ").strip().lower()

    if confirm != "y":
        print("Cleanup cancelled.")
        return

    for folder in folders_to_clean:
        remove_folder(folder)

    print("Cleanup complete.")
