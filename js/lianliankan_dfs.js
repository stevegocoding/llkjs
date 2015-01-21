var grid = [ [1, 2, 3], [1, 2, 3], [1, 2, 3], [1, 2, 3] ];
var dx, dy;

// Four directions: up, right, down, left
var dirs = [ [0, 1], [1, 0], [0, -1], [-1, 0] ];

var solved = false;

context = { 
	path: []
}

function getCellValue(grid, x, y) { 
	return grid[y][x];
}

function isCellWalkable(grid, x, y) { 
	return getCellValue(grid, x, y) == 0; 
}

function dfs(grid, x, y, dir, redirCount, ctx) {
	if (solved || redirCount > 2) { 
		return; 
	}

	if (x === dx && y === dy) {
		solved = true; 
		return;
	}

	for (var i = 0; i < 4; ++i) {
		// Next step x, y
		var nx = x + dirs[i][0];
		var ny = y + dirs[i][1];

		// Next step direction
		var nd = i; 

		ctx.path.push({nx, ny}); 

		// Look one step ahead
		// If we have the same element
		if (getCellValue(grid, nx, ny) == getCellValue(grid, dx, dy)) { 

			// If the next step's direction is differen from the current one, then 
			// increase one 
			if (nd != dir) { 
				redirCount++;

				// If we reach the destination coords and have less then 3 re-directions
				// then we have a solution
				if (nx == dx && ny == dy && redirCount <= 2) { 
					solved = true; 
					return; 
				}
			}
		}

		if (isCellWalkable(grid, nx, ny)) {
			if (nd != dir) { 
				redirCount++; 
			} 
			if (redirCount <= 2) { 
				dfs(grid, nx, ny, nd, redirCount, ctx); 
				ctx.path.pop();		// trace back! 
			}
		}
	}
}