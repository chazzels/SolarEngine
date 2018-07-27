/*
*	module to link up all the other engine modules to create a cohesive system.
*	TODO: build logging module.
*	TODO: function to dump shakey name map for later debuggin
*	TODO: add functionality to halt processig to allow for a debug scearios.
*	TODO: make simplePerf optional functionality. (just not always useful).
*	TODO: ??? rename renderCache to styleCache for clarity ???
*/

import { sha1 } from "./interface/sha1";

import {crystalObject } from "./interface/crystalObject";

class EngineCore {
	
	/* imported modules */
	private SimplePerf: any = require("../shared/simplePerf");
	private Crystal: any = require("../shared/crystalClock");
	private AssetManager: any = require("./assetManager");
	private AssetRender: any = require("./assetRender");
	private RenderCache: any = require("./renderCache");
	
	/* external modules */
	static simplePerf: any;
	static crystal: crystalObject;
	static assetManger: any;
	static assetRender: any;
	static renderCache: any;
	
	/* core loop variables */
	static manifest: any = [];
	static manifestLength: number = 0;
	static manifestIndex: number = -1;
	static tickStart: number = 0;
	static tickDiff: number = 0;
	static currentAssetKey: sha1;
	static assetObj: any;
	static currentAssetState: any;
	
	
	/* performance variables */
	static readonly ENGINELOOP: string = "EngineLoop";
	
	constructor(options?: any) {
		
		console.log("ENGINE_CORE::STARTING");
		
		console.group();
		
		if(options === undefined || options === null) {
		
			options = {};
		
		}
		
		// performance module initialization.
		EngineCore.simplePerf = new this.SimplePerf(options.perf);
		
		EngineCore.simplePerf.registerParameter(EngineCore.ENGINELOOP);
		
		// timer module initialization.
		EngineCore.crystal = new this.Crystal(10);
		
		EngineCore.crystal.onUpdate(this.tick);
		
		// internal modules.
		EngineCore.assetManger = new this.AssetManager(options, EngineCore.simplePerf);
		
		EngineCore.renderCache = new this.RenderCache(EngineCore.simplePerf);
		
		EngineCore.assetRender = new this.AssetRender(EngineCore.simplePerf);
		
		console.groupEnd();
		
	}
	
	/* load asset data into the engine. */
	/* returns an sha1 key for referencing the asset later. */
	loadAsset(assetData: any) {
		
		return EngineCore.assetManger.loadAsset(assetData);
		
	}
	
	/* removes asset data from the engine */
	dumpAsset(shakey: sha1) {
		
		EngineCore.assetManger.dumpAsset(shakey);
		
	}
	
	/* play an asset. set asset state to play and active. */
	play(shakey: sha1) {
		
		EngineCore.assetManger.play(shakey);
		
	}
	
	/* pause an asset. */
	pause(shakey: sha1) {
		
		EngineCore.assetManger.pause(shakey);
		
	}
	
	/* read cahced value from the render cahce. */
	read(shakey: sha1) {
		
		return EngineCore.renderCache.read(shakey);
		
	}
	
	/* funciton that triggers updating the calculated styles. */
	/* function passed to crystal update with this module as context passed*/
	/* TODO: change the name of this function. not clear as to what it does. */
	private tick() {
		
		EngineCore.tickStart = Date.now();
		
		// update the active playheads states
		EngineCore.manifest = EngineCore.assetManger.update();
		EngineCore.manifestLength = EngineCore.manifest.length;
		EngineCore.manifestIndex = -1;
		
		// loop through each active asset and calculate its current styles.
		for(let i = 0; i < EngineCore.manifestLength; i++) {
			
			if(EngineCore.manifestIndex + 1 < EngineCore.manifestLength) {
				
				EngineCore.manifestIndex++;
				
			}
			
			// update current asset key.
			EngineCore.currentAssetKey = EngineCore.manifest[EngineCore.manifestIndex];
			
			// get the assets data. 
			EngineCore.assetObj = EngineCore.assetManger.getState(EngineCore.currentAssetKey);
			
			if(EngineCore.assetObj !== null) {
				
				// set with new generated style from the render.
				EngineCore.currentAssetState = EngineCore.assetRender.update(EngineCore.assetObj);
				
				// write generated style to the cache.
				EngineCore.renderCache.write(EngineCore.currentAssetKey.hex, EngineCore.currentAssetState);
				
			} else {
				
				// asset not resolved console log message.
				console.log("ENGINE::ASSET_NULL:", EngineCore.currentAssetKey.hex);
				
			}
			
		}
		
		// register a hit with the performance monitor.
		EngineCore.simplePerf.hit(EngineCore.ENGINELOOP);
		
		// get end time of full execution for debugging.
		EngineCore.tickDiff = Date.now() - EngineCore.tickStart;
		
	}
	
}

export = EngineCore;