// ข้อมูลตัวอักษรภาษาอังกฤษพื้นฐาน (A-Z) ฝึกจับคู่ตัวพิมพ์ใหญ่-เล็ก
// group "uppercase": โจทย์เป็นตัวพิมพ์เล็ก ให้เขียนตัวพิมพ์ใหญ่ที่คู่กัน
// group "lowercase": โจทย์เป็นตัวพิมพ์ใหญ่ ให้เขียนตัวพิมพ์เล็กที่คู่กัน
const ENGLISH_DATA = (() => {
  const letters = "abcdefghijklmnopqrstuvwxyz".split("");
  const data = [];
  for (const letter of letters) {
    data.push({ char: letter.toUpperCase(), reading: letter, group: "uppercase" });
    data.push({ char: letter, reading: letter.toUpperCase(), group: "lowercase" });
  }
  return data;
})();
