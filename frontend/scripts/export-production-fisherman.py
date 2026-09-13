#!/usr/bin/env python3
"""Import Rocketbox gardener, apply fisherman PBR, rename bones, export GLB."""
import bpy
from mathutils import Vector, Matrix
from pathlib import Path
import math

TEX = Path("/tmp/rocketbox/fisherman_tex")
FBX = "/tmp/rocketbox/Gardener_Male_01/Export/Gardener_Male_01.fbx"
OUT = "/workspace/public/models/production/fisherman.glb"

BONE_MAP = {
    "Bip01 Pelvis": "Hips",
    "Bip01 Spine": "Spine",
    "Bip01 Spine1": "Spine1",
    "Bip01 Spine2": "Chest",
    "Bip01 Neck": "Neck",
    "Bip01 Head": "Head",
    "Bip01 L Clavicle": "Shoulder_L",
    "Bip01 R Clavicle": "Shoulder_R",
    "Bip01 L UpperArm": "UpperArm_L",
    "Bip01 L Forearm": "LowerArm_L",
    "Bip01 L Hand": "Hand_L",
    "Bip01 R UpperArm": "UpperArm_R",
    "Bip01 R Forearm": "LowerArm_R",
    "Bip01 R Hand": "Hand_R",
    "Bip01 L Thigh": "UpperLeg_L",
    "Bip01 L Calf": "LowerLeg_L",
    "Bip01 L Foot": "Foot_L",
    "Bip01 L Toe0": "Toe_L",
    "Bip01 R Thigh": "UpperLeg_R",
    "Bip01 R Calf": "LowerLeg_R",
    "Bip01 R Foot": "Foot_R",
    "Bip01 R Toe0": "Toe_R",
}

FINGER = ["Thumb", "Index", "Middle", "Ring", "Pinky"]
for side, pref in (("L", "Bip01 L"), ("R", "Bip01 R")):
    for i, name in enumerate(FINGER):
        BONE_MAP[f"{pref} Finger{i}"] = f"{name}_{side}_1"
        BONE_MAP[f"{pref} Finger{i}1"] = f"{name}_{side}_2"
        BONE_MAP[f"{pref} Finger{i}2"] = f"{name}_{side}_3"


def img(path):
    p = str(path)
    existing = bpy.data.images.get(Path(p).name)
    if existing:
        return existing
    return bpy.data.images.load(p)


def pbr(name, color, normal=None, rough=None, alpha=False):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = img(color)
    tex.image.colorspace_settings.name = "sRGB"
    nt.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    if alpha:
        nt.links.new(tex.outputs["Alpha"], bsdf.inputs["Alpha"])
        mat.blend_method = "HASHED"
        mat.shadow_method = "HASHED"
    if normal and Path(normal).exists():
        ntex = nt.nodes.new("ShaderNodeTexImage")
        ntex.image = img(normal)
        ntex.image.colorspace_settings.name = "Non-Color"
        nrm = nt.nodes.new("ShaderNodeNormalMap")
        nt.links.new(ntex.outputs["Color"], nrm.inputs["Color"])
        nt.links.new(nrm.outputs["Normal"], bsdf.inputs["Normal"])
    if rough and Path(rough).exists():
        rtex = nt.nodes.new("ShaderNodeTexImage")
        rtex.image = img(rough)
        rtex.image.colorspace_settings.name = "Non-Color"
        nt.links.new(rtex.outputs["Color"], bsdf.inputs["Roughness"])
    else:
        bsdf.inputs["Roughness"].default_value = 0.62
    bsdf.inputs["Metallic"].default_value = 0.0
    return mat


bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=FBX, automatic_bone_orientation=True, use_image_search=False)

arm = next(o for o in bpy.data.objects if o.type == "ARMATURE")
mesh_obj = next(o for o in bpy.data.objects if o.type == "MESH")
mesh_obj.name = "Fisherman"
mesh_obj.data.name = "Fisherman"

# Rename bones (edit mode) and matching vertex groups
bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode="EDIT")
for bone in list(arm.data.edit_bones):
    if bone.name in BONE_MAP:
        bone.name = BONE_MAP[bone.name]
bpy.ops.object.mode_set(mode="OBJECT")
for vg in mesh_obj.vertex_groups:
    if vg.name in BONE_MAP:
        vg.name = BONE_MAP[vg.name]

# One level of subdivision so density sits in the 30k target without changing silhouette.
bpy.context.view_layer.objects.active = mesh_obj
mesh_obj.select_set(True)
bpy.ops.object.mode_set(mode="EDIT")
bpy.ops.mesh.select_all(action="SELECT")
bpy.ops.mesh.subdivide(number_cuts=1)
bpy.ops.object.mode_set(mode="OBJECT")

# Materials
body_mat = pbr("jacket_body", TEX / "body_basecolor.png", TEX / "body_normal.png", TEX / "body_roughness.png")
head_mat = pbr("skin_head", TEX / "head_basecolor.png", TEX / "head_normal.png", TEX / "head_roughness.png")
hair_mat = pbr("hair_cards", TEX / "opacity_basecolor.png", alpha=True)
# assign by existing slot names
for i, slot in enumerate(mesh_obj.material_slots):
    n = (slot.material.name if slot.material else "").lower()
    if "head" in n:
        mesh_obj.material_slots[i].material = head_mat
    elif "opacity" in n or "hair" in n:
        mesh_obj.material_slots[i].material = hair_mat
    else:
        mesh_obj.material_slots[i].material = body_mat

# Ground the character (feet on z=0) and apply location
bpy.ops.object.select_all(action="DESELECT")
mesh_obj.select_set(True)
arm.select_set(True)
bpy.context.view_layer.objects.active = arm
# compute world bbox of mesh
deps = bpy.context.evaluated_depsgraph_get()
ev = mesh_obj.evaluated_get(deps)
bb = [mesh_obj.matrix_world @ Vector(c) for c in mesh_obj.bound_box]
min_z = min(p.z for p in bb)
arm.location.z -= min_z
mesh_obj.location.z -= min_z
# Face +Y in Blender → +Z in glTF so 0° yaw shows the front.
arm.rotation_euler[2] = math.pi

# Baseball cap parented / skinned to Head
head_bone = arm.pose.bones.get("Head")
if head_bone:
    head_world = arm.matrix_world @ head_bone.matrix
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=8, radius=0.095, location=(0, 0, 0))
    crown = bpy.context.active_object
    crown.name = "CapCrown"
    crown.scale = (1.05, 1.12, 0.55)
    bpy.ops.object.transform_apply(scale=True)
    bpy.ops.mesh.primitive_cube_add(size=0.12, location=(0, 0.09, -0.02))
    visor = bpy.context.active_object
    visor.name = "CapVisor"
    visor.scale = (0.92, 1.35, 0.12)
    bpy.ops.object.transform_apply(scale=True)
    bpy.ops.object.select_all(action="DESELECT")
    crown.select_set(True)
    visor.select_set(True)
    bpy.context.view_layer.objects.active = crown
    bpy.ops.object.join()
    cap = bpy.context.active_object
    cap.name = "Cap"
    cap.location = head_world.translation + Vector((0.0, 0.02, 0.11))
    cap.rotation_euler = head_world.to_euler()
    cap_mat = bpy.data.materials.new("cap")
    cap_mat.use_nodes = True
    bsdf = cap_mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (0.12, 0.14, 0.11, 1)
    bsdf.inputs["Roughness"].default_value = 0.72
    bsdf.inputs["Metallic"].default_value = 0.0
    cap.data.materials.append(cap_mat)
    # skin to Head
    cap.vertex_groups.new(name="Head")
    for vi, _ in enumerate(cap.data.vertices):
        cap.vertex_groups["Head"].add([vi], 1.0, "REPLACE")
    mod = cap.modifiers.new("Armature", "ARMATURE")
    mod.object = arm
    cap.parent = arm
    cap.parent_type = "ARMATURE"

# Cleanup empties / leftover
for o in list(bpy.data.objects):
    if o.type in {"EMPTY", "CAMERA", "LIGHT"}:
        bpy.data.objects.remove(o, do_unlink=True)

# Rest-pose IDLE so the mixer has a valid clip. Fishing actions are not authored here.
idle = bpy.data.actions.new("IDLE")
arm.animation_data_create()
arm.animation_data.action = idle
bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode="POSE")
for pb in arm.pose.bones:
    pb.location = (0, 0, 0)
    pb.rotation_quaternion = (1, 0, 0, 0)
    pb.keyframe_insert("location", frame=1)
    pb.keyframe_insert("rotation_quaternion", frame=1)
    pb.keyframe_insert("location", frame=48)
    pb.keyframe_insert("rotation_quaternion", frame=48)
bpy.ops.object.mode_set(mode="OBJECT")
bpy.context.scene.frame_start = 1
bpy.context.scene.frame_end = 48
bpy.context.scene.render.fps = 24

# Stats
tris = 0
for o in bpy.data.objects:
    if o.type == "MESH":
        tris += sum(len(p.vertices) - 2 for p in o.data.polygons)
print("EXPORT_TRIS", tris)
print("BONES", [b.name for b in arm.data.bones])

Path(OUT).parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(
    filepath=OUT,
    export_format="GLB",
    export_skins=True,
    export_texcoords=True,
    export_normals=True,
    export_tangents=True,
    export_cameras=False,
    export_lights=False,
    export_yup=True,
    export_apply=False,
    export_animations=True,
    export_nla_strips=False,
    export_force_sampling=True,
    export_image_format="AUTO",
    export_jpeg_quality=85,
)
print("WROTE", OUT)
