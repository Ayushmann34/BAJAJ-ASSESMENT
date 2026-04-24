const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// Enable CORS
app.use(cors());

// Parse JSON request bodies
app.use(express.json());

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// POST /bfhl endpoint
app.post('/bfhl', (req, res) => {
    const data = req.body.data;
    
    // Check if data is provided and is an array
    if (!data || !Array.isArray(data)) {
        return res.status(400).json({ error: "Invalid input, expected { data: [...] }" });
    }

    let invalid_entries = [];
    let duplicate_edges = [];
    let seen_edges = new Set();
    let edges = [];

    // Step 1 & 2: Validate input and handle duplicate edges
    for (let item of data) {
        if (typeof item !== 'string') {
            invalid_entries.push(item);
            continue;
        }
        
        let str = item.trim();
        // Check valid format: X->Y where X and Y are single uppercase letters
        if (/^[A-Z]->[A-Z]$/.test(str)) {
            if (seen_edges.has(str)) {
                // If we have seen this exact edge before, it's a duplicate
                duplicate_edges.push(str);
            } else {
                seen_edges.add(str);
                let [u, v] = str.split('->');
                edges.push({u, v, original: str});
            }
        } else {
            // Invalid formats like "hello", "1->2", "A-B", "A->A" (Wait, is A->A invalid?)
            // Requirement says "X and Y are single uppercase letters", A->A matches this.
            // Oh, requirement gave example: "A->A" as invalid input. 
            // So we need to explicitly reject self-loops. Let's fix that.
            invalid_entries.push(item);
        }
    }

    // Let me revise the validation loop:
    // Rebuild edges list to handle self-loops
    invalid_entries = [];
    duplicate_edges = [];
    seen_edges = new Set();
    edges = [];

    for (let item of data) {
        if (typeof item !== 'string') {
            invalid_entries.push(item);
            continue;
        }
        let str = item.trim();
        if (/^[A-Z]->[A-Z]$/.test(str)) {
            let [u, v] = str.split('->');
            if (u === v) {
                // "A->A" is considered invalid according to instructions
                invalid_entries.push(item);
            } else if (seen_edges.has(str)) {
                duplicate_edges.push(str);
            } else {
                seen_edges.add(str);
                edges.push({u, v, original: str});
            }
        } else {
            invalid_entries.push(item);
        }
    }


    // Step 3: Build graph
    let parent_of = {}; // maps node to its first parent
    let children_of = {}; // maps node to its list of children
    let all_nodes = new Set();

    for (let {u, v} of edges) {
        all_nodes.add(u);
        all_nodes.add(v);
        
        // If a node has multiple parents, keep only the first parent.
        if (!parent_of[v]) {
            parent_of[v] = u;
            if (!children_of[u]) children_of[u] = [];
            children_of[u].push(v);
        }
    }

    // Find disconnected components in the graph
    let nodes = Array.from(all_nodes);
    let visited = new Set();
    let components = [];

    for (let node of nodes) {
        if (!visited.has(node)) {
            let comp_nodes = new Set();
            let queue = [node];
            
            // Breadth First Search to find all weakly connected nodes
            while (queue.length > 0) {
                let curr = queue.shift();
                if (!comp_nodes.has(curr)) {
                    comp_nodes.add(curr);
                    visited.add(curr);
                    
                    let neighbors = [];
                    if (children_of[curr]) neighbors.push(...children_of[curr]);
                    if (parent_of[curr]) neighbors.push(parent_of[curr]);
                    
                    for (let neighbor of neighbors) {
                        if (!comp_nodes.has(neighbor)) {
                            queue.push(neighbor);
                        }
                    }
                }
            }
            components.push(Array.from(comp_nodes));
        }
    }

    let hierarchies = [];
    let total_trees = 0;
    let total_cycles = 0;
    let largest_tree_size = -1;
    let largest_tree_root = null;

    // Process each component
    for (let comp of components) {
        // Step 4: Identify root nodes (nodes without parents)
        let comp_roots = comp.filter(n => !parent_of[n]);
        let root;
        let has_cycle = false;

        if (comp_roots.length === 0) {
            // No root exists (cycle). Pick lexicographically smallest node.
            root = comp.sort()[0];
            has_cycle = true;
        } else {
            root = comp_roots[0];
        }

        // Step 6: Build tree structure recursively
        function buildTree(currentNode, currentVisited) {
            // Step 5: Detect cycles during tree traversal
            if (currentVisited.has(currentNode)) {
                has_cycle = true;
                return {}; // Return empty tree on cycle
            }
            
            let newVisited = new Set(currentVisited);
            newVisited.add(currentNode);
            
            let tree = {};
            let children = children_of[currentNode] || [];
            
            for (let child of children) {
                tree[child] = buildTree(child, newVisited);
            }
            return tree;
        }

        let tree_structure = {};
        tree_structure[root] = buildTree(root, new Set());

        // Step 7: Calculate depth
        function getDepth(node, treeObj) {
            let children = Object.keys(treeObj[node] || {});
            if (children.length === 0) return 1;
            let maxChildDepth = 0;
            for (let child of children) {
                maxChildDepth = Math.max(maxChildDepth, getDepth(child, treeObj[node]));
            }
            return 1 + maxChildDepth;
        }

        let depth = 0;
        if (has_cycle) {
            // If cycle exists, output tree as {}
            tree_structure = {};
            depth = 0;
            total_cycles += 1;
        } else {
            depth = getDepth(root, tree_structure);
            total_trees += 1;
            
            // Step 8: Keep track of largest tree root
            if (comp.length > largest_tree_size) {
                largest_tree_size = comp.length;
                largest_tree_root = root;
            } else if (comp.length === largest_tree_size) {
                // Tie breaker: lexicographically smaller
                if (largest_tree_root === null || root < largest_tree_root) {
                    largest_tree_root = root;
                }
            }
        }

        hierarchies.push({
            root: root,
            tree: tree_structure,
            has_cycle: has_cycle,
            depth: depth
        });
    }

    // Sort hierarchies for consistent output
    hierarchies.sort((a, b) => a.root.localeCompare(b.root));

    // Step 9: Final response format
    const responsePayload = {
        user_id: "ayushmann_18",
        email_id: "ac4289@srmist.edu.in",
        college_roll_number: "RA2311050010076",
        hierarchies: hierarchies,
        invalid_entries: invalid_entries,
        duplicate_edges: duplicate_edges,
        summary: {
            total_trees,
            total_cycles,
            largest_tree_root: total_trees > 0 ? largest_tree_root : null
        }
    };

    res.json(responsePayload);
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
