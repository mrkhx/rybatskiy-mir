using System;
using System.IO;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;
using UnityEngine;

namespace RybatskiyMir.Editor
{
    /// <summary>
    /// CI entry points for game-ci/unity-builder. Development builds only.
    /// Does not change runtime gameplay.
    /// </summary>
    public static class CiBuild
    {
        const string ScenePath = "Assets/_Project/Scenes/ForestLake.unity";

        public static void BuildWindows()
        {
            var dir = Arg("-customBuildPath", "build/StandaloneWindows64");
            Directory.CreateDirectory(dir);
            Build(BuildTarget.StandaloneWindows64, Path.Combine(dir, "RybatskiyMir3D.exe"));
        }

        public static void BuildWebGL()
        {
            var dir = Arg("-customBuildPath", "build/WebGL");
            Directory.CreateDirectory(dir);
            Build(BuildTarget.WebGL, dir);
        }

        static void Build(BuildTarget target, string location)
        {
            EnsureScene();
            EnableDevelopmentLogging(target);

            var options = new BuildPlayerOptions
            {
                scenes = new[] { ScenePath },
                locationPathName = location,
                target = target,
                options = BuildOptions.Development,
            };
            if (target != BuildTarget.WebGL)
                options.options |= BuildOptions.AllowDebugging;

            Debug.Log($"[CiBuild] Development build {target} → {location}");
            var report = BuildPipeline.BuildPlayer(options);
            var summary = report.summary;
            Debug.Log($"[CiBuild] result={summary.result} errors={summary.totalErrors} warnings={summary.totalWarnings} size={summary.totalSize}");
            if (summary.result != BuildResult.Succeeded)
            {
                throw new Exception($"Unity {target} development build failed: {summary.result}");
            }
        }

        static void EnsureScene()
        {
            if (!File.Exists(ScenePath))
            {
                Directory.CreateDirectory(Path.GetDirectoryName(ScenePath) ?? "Assets/_Project/Scenes");
                var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
                if (!EditorSceneManager.SaveScene(scene, ScenePath))
                    throw new Exception("Failed to create " + ScenePath);
            }

            EditorBuildSettings.scenes = new[]
            {
                new EditorBuildSettingsScene(ScenePath, true),
            };
        }

        static void EnableDevelopmentLogging(BuildTarget target)
        {
            PlayerSettings.companyName = "RybatskiyMir";
            PlayerSettings.productName = "Rybatskiy Mir";
            PlayerSettings.usePlayerLog = true;
            PlayerSettings.SetStackTraceLogType(LogType.Error, StackTraceLogType.Full);
            PlayerSettings.SetStackTraceLogType(LogType.Assert, StackTraceLogType.Full);
            PlayerSettings.SetStackTraceLogType(LogType.Exception, StackTraceLogType.Full);
            PlayerSettings.SetStackTraceLogType(LogType.Warning, StackTraceLogType.ScriptOnly);
            PlayerSettings.SetStackTraceLogType(LogType.Log, StackTraceLogType.ScriptOnly);
            PlayerSettings.actionOnDotNetUnhandledException = ActionOnDotNetUnhandledException.Crash;
            EnableInputSystemBoth();

            if (target == BuildTarget.WebGL)
            {
                PlayerSettings.WebGL.exceptionSupport = WebGLExceptionSupport.FullWithStacktrace;
                PlayerSettings.WebGL.debugSymbols = true;
            }
        }

        static void EnableInputSystemBoth()
        {
            var assets = AssetDatabase.LoadAllAssetsAtPath("ProjectSettings/ProjectSettings.asset");
            if (assets == null || assets.Length == 0) return;
            var so = new SerializedObject(assets[0]);
            var prop = so.FindProperty("activeInputHandler");
            if (prop == null || prop.intValue == 2) return;
            prop.intValue = 2;
            so.ApplyModifiedPropertiesWithoutUndo();
        }

        static string Arg(string name, string fallback)
        {
            var args = Environment.GetCommandLineArgs();
            for (int i = 0; i < args.Length - 1; i++)
            {
                if (args[i] == name) return args[i + 1];
            }
            return fallback;
        }
    }
}
