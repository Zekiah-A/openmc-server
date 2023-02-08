import { Item } from '../../items/item.js'
import { DataWriter } from '../../utils/data.js'
import { Entities, Entity } from '../entity.js'

Entities.item = class ItemEntity extends Entity{
	item = null
	static width = 0.25
	static height = 0.25
	static savedata = {item: Item}
	touch(e){
		if(!this.item) return
		if(e instanceof ItemEntity && e.item && e.item.constructor == this.item.constructor && !this.item.savedata && this.world){
			e.remove()
			this.item.count += e.item.count
			this.x += (e.x - this.x) / 2
			this.y += (e.y - this.y) / 2
			return
		}
		if(this.age < 10 || !e.inv) return
		e.give(this.item)
		this.event(1)
		if(this.item.count <= 0) this.remove()
	}
}