import os

def get_tree_string(startpath, recursive=True):
    """Generates a tree-like string representing the directory structure."""
    output = []
    
    if not recursive:
        # Shallow version for root directory
        try:
            items = sorted(os.listdir(startpath))
            for item in items:
                if item.startswith('.') or item == 'tree.txt' or item in ['node_modules', 'venv', '__pycache__']:
                    continue
                path = os.path.join(startpath, item)
                icon = "📁" if os.path.isdir(path) else "📄"
                output.append(f"{icon} {item}")
        except Exception as e:
            output.append(f"Error reading directory: {e}")
        return "\n".join(output)

    # Recursive version for sub-modules
    def build_tree(current_path, prefix=""):
        try:
            # Sort directories first, then files
            entries = sorted(os.listdir(current_path))
            # Filter out ignored patterns
            entries = [e for e in entries if not e.startswith('.') and e != 'tree.txt' and e not in ['node_modules', 'venv', '__pycache__']]
            
            for i, entry in enumerate(entries):
                is_last = (i == len(entries) - 1)
                connector = "└── " if is_last else "├── "
                path = os.path.join(current_path, entry)
                
                output.append(f"{prefix}{connector}{entry}")
                
                if os.path.isdir(path):
                    new_prefix = prefix + ("    " if is_last else "│   ")
                    build_tree(path, new_prefix)
        except Exception as e:
            output.append(f"{prefix} [Error: {e}]")

    build_tree(startpath)
    return "\n".join(output)

def update_all_trees():
    project_root = os.getcwd()
    target_dirs = ['backend', 'database', 'src']
    
    print(f"Generating root tree.txt (shallow)...")
    root_tree = get_tree_string(project_root, recursive=False)
    with open('tree.txt', 'w', encoding='utf-8') as f:
        f.write("# Root Directory Structure (Shallow)\n")
        f.write(root_tree + "\n")

    for target in target_dirs:
        target_path = os.path.join(project_root, target)
        if not os.path.exists(target_path):
            print(f"Skipping {target}: Directory not found.")
            continue
            
        print(f"Processing directory: {target}...")
        
        # Traverse recursively and create tree.txt in each folder
        for root, dirs, files in os.walk(target_path):
            # Skip hidden folders and common noise
            dirs[:] = [d for d in dirs if not d.startswith('.') and d not in ['node_modules', 'venv', '__pycache__']]
            
            # Generate recursive tree from THIS folder downwards
            tree_content = get_tree_string(root, recursive=True)
            
            tree_file_path = os.path.join(root, 'tree.txt')
            with open(tree_file_path, 'w', encoding='utf-8') as f:
                f.write(f"# Directory Structure for: {os.path.relpath(root, project_root)}\n")
                f.write(tree_content + "\n")

if __name__ == "__main__":
    update_all_trees()
    print("Done! All tree.txt files have been updated.")
