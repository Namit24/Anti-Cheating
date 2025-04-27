import { NextResponse } from "next/server"
import { exec } from "child_process"
import { promisify } from "util"
import { writeFile } from "fs/promises"
import { join } from "path"
import { v4 as uuidv4 } from "uuid"
import { db } from "@/lib/db"

const execAsync = promisify(exec)

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { code, studentId, examId } = body

    if (!code || !studentId || !examId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Create a temporary file with the code
    const tempFileName = `code_${uuidv4()}.txt`
    const tempFilePath = join("/tmp", tempFileName)

    await writeFile(tempFilePath, code)

    // Run Python script to analyze the code
    // This would be a more sophisticated analysis than what JavaScript can do
    const pythonScript = `
import sys
import re
import json

def analyze_code(file_path):
    with open(file_path, 'r') as f:
        code = f.read()
    
    results = {
        'is_suspicious': False,
        'reasons': []
    }
    
    # Check for common LLM patterns
    patterns = [
        (r'# This (function|code|implementation) [a-z\\s]+(efficiently|elegantly)', 'LLM-style comments'),
        (r'# [A-Z]\\w+ the [a-z\\s]+ (function|algorithm|implementation)', 'LLM-style comments'),
        (r'# Step [0-9]+:', 'Step-by-step comments typical of LLMs'),
        (r'# [A-Z]\\w+ [a-z\\s]+ in O\$$[^)]+\$$ time', 'Big-O notation in comments'),
        (r'# Time [Cc]omplexity: O\$$[^)]+\$$', 'Formal time complexity analysis'),
        (r'# Space [Cc]omplexity: O\$$[^)]+\$$', 'Formal space complexity analysis'),
        (r'def [a-zA-Z_]+\$$[^)]{40,}\$$:', 'Very long parameter list'),
        (r'"""[\\s\\S]{100,}?"""', 'Extensive docstring'),
        (r'# Edge [Cc]ases:', 'Edge case analysis typical of LLMs'),
        (r'# [A-Z]\\w+: [a-zA-Z\\s]{40,}', 'Lengthy explanatory comments')
    ]
    
    for pattern, reason in patterns:
        if re.search(pattern, code):
            results['is_suspicious'] = True
            if reason not in results['reasons']:
                results['reasons'].append(reason)
    
    # Check for unusually perfect code structure
    lines = code.split('\\n')
    indentation_pattern = []
    for line in lines:
        if line.strip():
            spaces = len(line) - len(line.lstrip())
            indentation_pattern.append(spaces)
    
    # Check for very consistent indentation patterns
    if len(indentation_pattern) > 10:
        unique_indents = set(indentation_pattern)
        if len(unique_indents) <= 3 and len(indentation_pattern) > 20:
            results['is_suspicious'] = True
            results['reasons'].append('Unusually consistent code structure')
    
    # Check for advanced algorithms implemented perfectly
    advanced_algorithms = [
        'dynamic programming', 'binary search', 'depth first search', 'breadth first search',
        'dijkstra', 'a* search', 'merge sort', 'quick sort', 'heap sort', 'topological sort',
        'kruskal', 'prim', 'bellman-ford', 'floyd-warshall', 'kmp algorithm', 'rabin-karp'
    ]
    
    code_lower = code.lower()
    for algo in advanced_algorithms:
        if algo in code_lower:
            # Check if the algorithm is implemented in a small number of lines
            # which might indicate copy-paste from LLM
            if len(lines) < 50:
                results['is_suspicious'] = True
                results['reasons'].append(f'Perfect implementation of {algo}')
    
    return results

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(json.dumps({"error": "Missing file path"}))
        sys.exit(1)
    
    file_path = sys.argv[1]
    results = analyze_code(file_path)
    print(json.dumps(results))
    `

    // Write the Python script to a temporary file
    const scriptFileName = `script_${uuidv4()}.py`
    const scriptFilePath = join("/tmp", scriptFileName)
    await writeFile(scriptFilePath, pythonScript)

    // Execute the Python script
    const { stdout, stderr } = await execAsync(`python3 ${scriptFilePath} ${tempFilePath}`)

    if (stderr) {
      console.error("Python script error:", stderr)
      return NextResponse.json({ error: "Error analyzing code" }, { status: 500 })
    }

    // Parse the results
    const results = JSON.parse(stdout)

    // If the code is suspicious, create an incident
    if (results.is_suspicious) {
      await db.incident.create({
        data: {
          student: {
            connect: {
              id: studentId,
            },
          },
          exam: {
            connect: {
              id: examId,
            },
          },
          incidentType: "nlp_suspicious",
          details: `Suspicious code detected: ${results.reasons.join(", ")}\n\nCode:\n${code.substring(0, 500)}${code.length > 500 ? "..." : ""}`,
          timestamp: new Date(),
        },
      })
    }

    return NextResponse.json({
      suspicious: results.is_suspicious,
      reasons: results.reasons,
    })
  } catch (error) {
    console.error("Error in NLP check:", error)
    return NextResponse.json({ error: "Failed to analyze code" }, { status: 500 })
  }
}
