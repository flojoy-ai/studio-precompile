from fastapi import APIRouter, Response
from captain.utils.manifest.generate_manifest import generate_manifest
from captain.utils.nodes_metadata import generate_metadata, generate_metadata_mc
import json

router = APIRouter(tags=["nodes"])


@router.get("/nodes/manifest/")
async def get_manifest():
    try:
        manifest = generate_manifest()
        return manifest
    except Exception as e:
        return Response(
            status_code=400,
            content=json.dumps({"success": False, "error": "\n".join(e.args)}),
        )


@router.get("/nodes-mc/manifest/")
async def get_mc_manifest():
    try:
        manifest = generate_manifest(is_mc=True)
        return manifest
    except Exception as e:
        return Response(
            status_code=400,
            content=json.dumps({"success": False, "error": "\n".join(e.args)}),
        )


@router.get("/nodes/metadata/")
async def get_metadata():
    try:
        metadata_map = generate_metadata()
        return metadata_map
    except Exception as e:
        return Response(
            status_code=400,
            content=json.dumps({"success": False, "error": "\n".join(e.args)}),
        )

@router.get("/nodes-mc/metadata/")
async def get_metadata_mc():
    try:
        metadata_map = generate_metadata_mc()
        return metadata_map
    except Exception as e:
        return Response(
            status_code=400,
            content=json.dumps({"success": False, "error": "\n".join(e.args)}),
        )
