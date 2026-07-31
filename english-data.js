// ข้อมูลตัวอักษร/คำศัพท์ภาษาอังกฤษ
// group "uppercase": โจทย์เป็นตัวพิมพ์เล็ก ให้เขียนตัวพิมพ์ใหญ่ที่คู่กัน
// group "lowercase": โจทย์เป็นตัวพิมพ์ใหญ่ ให้เขียนตัวพิมพ์เล็กที่คู่กัน
// group "toeic600": คำศัพท์ธุรกิจ/สำนักงานที่พบบ่อยระดับ TOEIC ~600
//   (คัดสรรคำที่พบบ่อย ไม่ใช่คลังคำศัพท์ทางการของ ETS)
const ENGLISH_DATA = (() => {
  const letters = "abcdefghijklmnopqrstuvwxyz".split("");
  const data = [];
  for (const letter of letters) {
    data.push({ char: letter.toUpperCase(), reading: letter, group: "uppercase" });
    data.push({ char: letter, reading: letter.toUpperCase(), group: "lowercase" });
  }

  const toeic600 = [
    ["invoice", "ใบแจ้งหนี้"],
    ["receipt", "ใบเสร็จ"],
    ["schedule", "ตารางเวลา"],
    ["deadline", "กำหนดส่งงาน"],
    ["meeting", "การประชุม"],
    ["conference", "การประชุมใหญ่"],
    ["colleague", "เพื่อนร่วมงาน"],
    ["supervisor", "หัวหน้างาน"],
    ["employee", "ลูกจ้าง/พนักงาน"],
    ["employer", "นายจ้าง"],
    ["salary", "เงินเดือน"],
    ["budget", "งบประมาณ"],
    ["expense", "ค่าใช้จ่าย"],
    ["revenue", "รายได้"],
    ["profit", "กำไร"],
    ["discount", "ส่วนลด"],
    ["customer", "ลูกค้า"],
    ["client", "ลูกค้า (ธุรกิจ)"],
    ["contract", "สัญญา"],
    ["agreement", "ข้อตกลง"],
    ["negotiate", "เจรจาต่อรอง"],
    ["approve", "อนุมัติ"],
    ["reject", "ปฏิเสธ"],
    ["cancel", "ยกเลิก"],
    ["confirm", "ยืนยัน"],
    ["reserve", "จอง"],
    ["reservation", "การจอง"],
    ["itinerary", "กำหนดการเดินทาง"],
    ["departure", "การออกเดินทาง"],
    ["arrival", "การมาถึง"],
    ["delay", "ความล่าช้า"],
    ["luggage", "กระเป๋าเดินทาง"],
    ["boarding", "การขึ้นเครื่อง"],
    ["passenger", "ผู้โดยสาร"],
    ["warehouse", "โกดัง"],
    ["inventory", "สินค้าคงคลัง"],
    ["shipment", "การขนส่งสินค้า"],
    ["delivery", "การจัดส่ง"],
    ["supplier", "ผู้จัดหาสินค้า"],
    ["manufacturer", "ผู้ผลิต"],
    ["quality", "คุณภาพ"],
    ["quantity", "ปริมาณ"],
    ["warranty", "การรับประกัน"],
    ["refund", "การคืนเงิน"],
    ["complaint", "ข้อร้องเรียน"],
    ["feedback", "ความคิดเห็น"],
    ["survey", "แบบสำรวจ"],
    ["proposal", "ข้อเสนอ"],
    ["presentation", "การนำเสนอ"],
    ["announcement", "ประกาศ"],
    ["memo", "บันทึกช่วยจำ"],
    ["attachment", "ไฟล์แนบ"],
    ["signature", "ลายเซ็น"],
    ["document", "เอกสาร"],
    ["application", "ใบสมัคร"],
    ["candidate", "ผู้สมัคร"],
    ["resume", "ประวัติย่อ"],
    ["interview", "สัมภาษณ์"],
    ["promotion", "การเลื่อนตำแหน่ง"],
    ["resign", "ลาออก"],
    ["retire", "เกษียณ"],
    ["vacancy", "ตำแหน่งงานว่าง"],
    ["qualification", "คุณสมบัติ"],
    ["benefit", "สวัสดิการ"],
    ["insurance", "ประกันภัย"],
    ["account", "บัญชี"],
    ["transaction", "ธุรกรรม"],
    ["transfer", "การโอนเงิน"],
    ["withdraw", "ถอนเงิน"],
    ["deposit", "ฝากเงิน"],
    ["loan", "เงินกู้"],
    ["investment", "การลงทุน"],
    ["headquarters", "สำนักงานใหญ่"],
    ["branch", "สาขา"],
    ["department", "แผนก"],
    ["manager", "ผู้จัดการ"],
    ["director", "ผู้อำนวยการ"],
    ["committee", "คณะกรรมการ"],
    ["strategy", "กลยุทธ์"],
    ["efficient", "มีประสิทธิภาพ"],
    ["punctual", "ตรงเวลา"],
    ["reliable", "เชื่อถือได้"],
  ];
  for (const [word, thaiMeaning] of toeic600) {
    data.push({ char: word, reading: thaiMeaning, group: "toeic600" });
  }

  return data;
})();
