from pathlib import Path
import shutil


def clean_folder(folder_path: str) -> None:
    folder = Path(folder_path)

    if not folder.exists():
        print(f"Folder does not exist: {folder}")
        return

    if not folder.is_dir():
        print(f"Not a folder: {folder}")
        return

    for item in folder.iterdir():
        if item.is_file():
            item.unlink()
            print(f"Deleted file: {item}")
        elif item.is_dir():
            shutil.rmtree(item)
            print(f"Deleted folder: {item}")


def cleanup_project() -> None:
    folders_to_clean = [
        "input",
        "output"
    ]

    confirm = input("This will delete files in input/ and output/. Continue? (y/n): ").strip().lower()

    if confirm != "y":
        print("Cleanup cancelled.")
        return

    for folder in folders_to_clean:
        clean_folder(folder)

    print("Cleanup complete.")
