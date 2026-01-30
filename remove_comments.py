#!/usr/bin/env python3
import os
import re
from pathlib import Path

def remove_comments_from_content(content):
    """Remove all types of comments from code while preserving code structure."""
    lines = content.split('\n')
    result = []
    i = 0
    in_multiline = False
    
    while i < len(lines):
        line = lines[i]
        new_line = ""
        j = 0
        
        while j < len(line):
            # Check for start of multiline comment
            if not in_multiline and j + 1 < len(line) and line[j:j+2] == '/*':
                # Find the end of the multiline comment
                end_pos = line.find('*/', j + 2)
                if end_pos != -1:
                    # Comment ends on same line
                    j = end_pos + 2
                    in_multiline = False
                else:
                    # Comment extends to next lines
                    in_multiline = True
                    j = len(line)
            elif in_multiline:
                # Look for end of multiline comment
                end_pos = line.find('*/')
                if end_pos != -1:
                    # End of comment found
                    new_line += line[end_pos + 2:]
                    j = len(line)
                    in_multiline = False
                else:
                    # Comment continues, skip this entire line
                    j = len(line)
            # Check for single-line comment
            elif j + 1 < len(line) and line[j:j+2] == '//':
                # Rest of line is a comment
                # Check if there's any code before the comment
                break
            elif line[j] == '"' or line[j] == "'":
                # String literal - need to preserve it
                quote = line[j]
                new_line += quote
                j += 1
                while j < len(line):
                    if line[j] == quote and (j == 0 or line[j-1] != '\\'):
                        new_line += quote
                        j += 1
                        break
                    else:
                        new_line += line[j]
                        j += 1
            else:
                new_line += line[j]
                j += 1
        
        # Add the line if it's not empty or if it contains code
        stripped = new_line.strip()
        if stripped and not in_multiline:
            result.append(new_line.rstrip())
        elif new_line.strip():
            result.append(new_line.rstrip())
        elif i < len(lines) - 1:
            # Check if next line has content to preserve spacing
            result.append("")
        
        i += 1
    
    # Clean up: remove trailing empty lines
    while result and not result[-1].strip():
        result.pop()
    
    return '\n'.join(result)

def process_files():
    """Process all source files in the project."""
    root_dir = Path("C:\\Users\\admin\\Desktop\\sentra")
    extensions = {'.ts', '.tsx', '.js', '.mjs', '.json'}
    config_files = {'electron.vite.config.ts', 'eslint.config.mjs', 'tsconfig.json', 'tsconfig.node.json', 'tsconfig.web.json'}
    
    files_to_process = []
    
    # Find all source files
    for pattern in ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.mjs']:
        files_to_process.extend(root_dir.glob(pattern))
    
    # Add root config files
    for config_file in config_files:
        config_path = root_dir / config_file
        if config_path.exists():
            files_to_process.append(config_path)
    
    # Remove duplicates
    files_to_process = list(set(files_to_process))
    
    processed_count = 0
    
    print(f"Found {len(files_to_process)} files to process")
    
    for file_path in sorted(files_to_process):
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                original_content = f.read()
            
            # Skip node_modules and dist
            if 'node_modules' in str(file_path) or 'dist' in str(file_path) or 'out' in str(file_path):
                continue
            
            new_content = remove_comments_from_content(original_content)
            
            if new_content != original_content:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                processed_count += 1
                print(f"✓ {file_path.relative_to(root_dir)}")
        
        except Exception as e:
            print(f"✗ Error processing {file_path}: {str(e)}")
    
    print(f"\nProcessed {processed_count} files successfully")

if __name__ == "__main__":
    process_files()
