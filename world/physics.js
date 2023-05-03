import { optimize } from "../internals.js"
import { goto, peekat } from "../misc/ant.js"
import { current_tps } from "./tick.js"

export function stepEntity(e, dt = 1 / current_tps){
	fastCollision(e, dt)
	if(e.state & 1)e.dy = 0
	else{
		e.dy += dt * e.world.gy * e.gy
		e.dy = e.dy * e.yDrag ** dt
		e.dx += dt * e.world.gx * e.gx
	}
	e.dx = e.dx * (e.state & 0x10000 ? e.groundDrag : e.airDrag) ** dt

	// Entity collision
	const x0 = e.x - e.width - e.collisionTestPadding, x1 = e.x + e.width + e.collisionTestPadding
	const y0 = e.y - e.collisionTestPadding, y1 = e.y + e.height + e.collisionTestPadding
	const cx0 = floor(x0 - 16) >>> 6, cx1 = ceil((x1 + 16) / 64) & 67108863
	const cy0 = floor(y0) >>> 6, cy1 = ceil((y1 + 32) / 64) & 67108863
	for(let cx = cx0; cx != cx1; cx = cx + 1 & 67108863){
		for(let cy = cy0; cy != cy1; cy = cy + 1 & 67108863){
			const chunk = e.chunk && (e.chunk.x == cx & e.chunk.y == cy) ? e.chunk : e.world && e.world.get(cx+cy*67108864)
			if(!chunk || !chunk.tiles) continue
			for(const e2 of chunk.entities){
				const {collisionTestPadding: ctp} = e2
				if(e2.netId <= e.netId || e2.x + e2.width + ctp < x0 || e2.x - e2.width - ctp > x1 || e2.y + e2.height + ctp < y0 || e2.y - ctp > y1) continue
				e.touch?.(e2)
				e2.touch?.(e)
			}
		}
	}
	e.age++
	e.update?.()
}

export const EPSILON = .0001

function fastCollision(e, dt){
	const blocksTouched = new Set
	const dx = e.dx * dt, dy = e.dy * dt
	let x = e.x, y = e.y
	let flags = 0
	const x0 = floor(x - e.width + EPSILON), x1 = ceil(x + e.width - EPSILON) - x0
	const y0 = floor(y + EPSILON), y1 = ceil(y + e.height - EPSILON) - y0
	goto(x0, y0, e.world)
	y: if(dy > 0){
		const ey = ceil(e.y + e.height + dy - EPSILON) + 1 - y0
		for(let y = y1; y < ey; y++){
			for(let x = 0; x < x1; x++){
				const block = peekat(x, y - 1)
				blocksTouched.add(block)
				const ys = y - block.solid
				if(ys == y | ys + y0 < e.y + e.height - EPSILON)continue
				e.y = min(ys + y0 - e.height, e.y + dy)
				e.dy = 0
				break y
			}
		}
		y = ifloat(e.y + dy)
	}else if(dy < 0){
		const ey = floor(e.y + dy + EPSILON) - 1 - y0
		for(let y = 0; y > ey; y--){
			for(let x = 0; x < x1; x++){
				const block = peekat(x, y)
				blocksTouched.add(block)
				const ys = y + block.solid
				if(ys == y | ys + y0 > e.y + EPSILON)continue
				e.y = max(ys + y0, e.y + dy)
				e.dy = 0
				flags |= 1
				break y
			}
		}
		y = ifloat(e.y + dy)
	}
	x: if(dx > 0){
		const ex = ceil(e.x + e.width + dx - EPSILON) + 1 - x0
		for(let x = x1; x < ex; x++){
			for(let y = 0; y < y1; y++){
				const block = peekat(x - 1, y)
				blocksTouched.add(block)
				const xs = x - block.solid
				if(xs == x | xs + x0 < e.x + e.width - EPSILON)continue
				e.x = min(xs + x0 - e.width, e.x + dx)
				e.dx = 0
				break x
			}
		}
		x = ifloat(e.x + dx)
	}else if(dx < 0){
		const ex = floor(e.x - e.width + dx + EPSILON) - 1 - x0
		for(let x = 0; x > ex; x--){
			for(let y = 0; y < y1; y++){
				const block = peekat(x, y)
				blocksTouched.add(block)
				const xs = x + block.solid
				if(xs == x | xs + x0 > e.x - e.width + EPSILON)continue
				e.x = max(xs + x0 + e.width, e.x + dx)
				e.dx = 0
				break x
			}
		}
		x = ifloat(e.x + dx)
	}
	e.x = x
	e.y = y
	e.state = e.state & 0xffff | flags << 16
	return blocksTouched
}

optimize(stepEntity)
optimize(fastCollision)