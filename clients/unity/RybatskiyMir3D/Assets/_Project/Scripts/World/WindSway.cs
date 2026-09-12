using UnityEngine;

namespace RybatskiyMir.World
{
    /// <summary>Per-instance phase so trees/reeds do not sway in lockstep.</summary>
    public class WindSway : MonoBehaviour
    {
        public float Amount = 2.4f;
        public float HeightBoost = 1f;
        Quaternion _rest;
        float _phase;

        void Awake()
        {
            _rest = transform.localRotation;
            _phase = transform.position.x * 0.37f + transform.position.z * 0.21f;
        }

        void LateUpdate()
        {
            var g = WindField.Gust;
            var d = WindField.Dir;
            var s = WindField.Strength * Amount * HeightBoost;
            var wobble = Mathf.Sin(Time.time * (0.7f + g * 0.5f) + _phase);
            var x = d.z * s * wobble;
            var z = -d.x * s * (wobble * 0.65f + 0.2f);
            transform.localRotation = _rest * Quaternion.Euler(x, 0f, z);
        }
    }
}
