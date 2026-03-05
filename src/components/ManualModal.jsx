import { X, BookOpen, ChevronRight, TrendingUp, Info, AlertTriangle, Plus, Trash2, GitBranch } from 'lucide-react';
import { useApp } from '../context/AppContext';

const WEIGHT_RULES = [
  {
    icon: '⚠️',
    rule: 'ผลรวม % Weight ของ Sub-activities ทั้งหมดในโครงการ ต้องเท่ากับ 100% เสมอ',
    detail: 'ระบบคำนวณ S-Curve โดยใช้ Weight ของ Leaf Activities (Sub ที่ไม่มีลูก) เท่านั้น หากรวมไม่ครบ 100% เส้น Plan จะไม่ถึง 100% ที่จุดสิ้นสุดโครงการ'
  },
  {
    icon: '➕',
    rule: 'การเพิ่ม Activity: กดปุ่ม "+Main" ในหัวตาราง เพื่อเพิ่ม Main Activity หรือ hover ที่แถว Main แล้วกด icon กิ่ง (Branch) เพื่อเพิ่ม Sub-activity',
    detail: 'ระบบจะแสดงยอด Weight ที่เหลือได้ เพื่อช่วยคุณกรอกค่าได้ถูกต้อง และป้องกันไม่ให้รวมเกิน 100%'
  },
  {
    icon: '🗑️',
    rule: 'การลบ Activity: hover ที่แถว แล้วกด icon ถังขยะ (Trash) — ระบบจะขอยืนยันก่อนลบเสมอ',
    detail: 'การลบ Main Activity จะลบ Sub-activities ทั้งหมดที่อยู่ภายใต้ด้วย WBS จะถูกเรียงหมายเลขใหม่อัตโนมัติ'
  },
  {
    icon: '✏️',
    rule: 'การแก้ไข % Weight: คลิกที่แถวใดก็ได้เพื่อเปิด Edit Modal แล้วแก้ไขค่า Weight',
    detail: 'หลังแก้ไข ให้ตรวจสอบแถบสถานะ Weight ที่ด้านบนตาราง: สีเขียว = 100% (ถูกต้อง), สีเหลือง = ขาด, สีแดง = เกิน'
  },
  {
    icon: '🔢',
    rule: 'WBS จะถูก Renumber อัตโนมัติ ทุกครั้งที่เพิ่มหรือลบ Activity',
    detail: 'ไม่จำเป็นต้องจัดลำดับเอง ระบบจัดเรียง 1, 2, 3... และ 1.1, 1.2... ให้เสมอ'
  },
];

const MANUAL_SECTIONS = [
  {
    id: 1,
    title: '1. โครงสร้างแผนงาน (WBS & Weight)',
    content: [
      'สร้าง Main Activity (กิจกรรมหลัก) และ Sub-activity (กิจกรรมย่อย) โดยผลรวม % Weight ทั้งโครงการต้องเท่ากับ 100% เสมอ',
      'WBS (Work Breakdown Structure): ระบบจะกำหนดเลข 1, 2, 3 ให้ Main และ 1.1, 1.2 ให้ Sub อัตโนมัติ',
      'การเลื่อนวันของ Sub-activity จะส่งผลให้อายุงานของ Main Activity เปลี่ยนแปลงอัตโนมัติ (Roll-up)',
      'ตัวเลข % Weight บน Main Activity ไม่ได้ใช้คำนวณ S-Curve — ระบบใช้เฉพาะ Weight ของ Sub-activities เท่านั้น',
    ],
  },
  {
    id: 2,
    title: '2. การอัปเดตความก้าวหน้า (Progress Tracking)',
    content: [
      'Plan Bar (สีเทา): แผนงานตั้งต้น (Baseline)',
      'Actual Bar (สีน้ำเงิน/เขียว): งานที่ทำจริง พร้อมแถบสีเข้มแสดง % ความก้าวหน้า',
      'S-Curve: ระบบจะนำ % Weight มากระจายตามวันทำงาน เพื่อวาดเส้น Plan (แผน) เทียบกับ Actual (ทำจริง)',
    ],
  },
  {
    id: 3,
    title: '3. รายงาน 3-Week Lookahead',
    content: [
      'ใช้สำหรับประชุมประจำสัปดาห์ กดปุ่ม "3-Week" เพื่อดูเฉพาะงานที่ "กำลังทำอยู่" หรือ "จะเริ่มในอีก 3 สัปดาห์ข้างหน้า"',
      'ตารางแสดงสีสถานะ: น้ำเงิน = กำลังดำเนินการ, เหลือง = ใกล้เริ่ม, แดง = ล่าช้า (ไม่ได้เริ่ม), เขียว = เสร็จแล้ว',
      'ช่อง "วันเสร็จแผน" จะแสดงจำนวนวันที่เหลือ หรือเกินกำหนดเป็นสีแดงโดยอัตโนมัติ',
    ],
  },
];

const TIPS = [
  { icon: '📋', text: 'ผลรวม Weight ของ Sub-activities ควรเท่ากับ Weight ของ Main Activity และผลรวมทั้งโครงการ = 100%' },
  { icon: '🎯', text: 'ใส่ Actual Start เมื่อเริ่มงานจริง และ Actual Finish เมื่อเสร็จสิ้น — ระบบจะอัปเดต S-Curve อัตโนมัติ' },
  { icon: '📊', text: 'ตั้ง % Progress ให้ตรงกับสภาพจริง เช่น งานขุดดิน 50% = ขุดไปแล้วครึ่งหนึ่งของปริมาณทั้งหมด' },
  { icon: '🖨️', text: 'กดปุ่ม "พิมพ์" เพื่อพิมพ์รายงาน A4 แนวนอน (Landscape) พร้อม S-Curve และตาราง WBS' },
  { icon: '⚠️', text: 'หาก S-Curve เส้นจริง (Actual) อยู่ต่ำกว่าเส้นแผน (Plan) แสดงว่าโครงการ "ล่าช้ากว่าแผน" ต้องเร่งดำเนินการ' },
  { icon: '🔄', text: 'กดปุ่ม "3-Week" เพื่อเปลี่ยนมุมมองเป็นตาราง Lookahead สำหรับการประชุมประจำสัปดาห์' },
];

const SCURVE_ELEMENTS = [
  {
    term: '% Weight (น้ำหนักงาน)',
    color: 'text-accent-400',
    meaning: 'สัดส่วนความสำคัญของแต่ละกิจกรรมต่องานทั้งหมด สะท้อนปริมาณงาน (Volume) หรือมูลค่า (Value) เช่น งานฐานราก = 20% หมายถึงมีน้ำหนักงาน 20 ใน 100 ส่วนของโครงการ',
    prepare: 'คำนวณจากราคาค่าก่อสร้างแต่ละหมวดหาร ด้วยมูลค่าโครงการรวม หรือใช้ปริมาณงาน (BOQ) เป็นฐาน',
  },
  {
    term: 'Plan % (เส้นแผนสะสม)',
    color: 'text-[#829ab1]',
    meaning: 'เส้น S-Curve สีเทา แสดงผลรวมสะสมของ % Weight ที่ควรจะทำได้ ณ แต่ละช่วงเวลาตามแผนงาน ระบบกระจาย Weight แต่ละกิจกรรมเป็นรายวันตลอดช่วง Plan Start → Plan Finish แล้วนำมาสะสม',
    prepare: 'กรอก Plan Start และ Plan Finish ให้ครบทุก Sub-activity — ยิ่งข้อมูลแม่นยำ เส้นแผนยิ่งสมจริง',
  },
  {
    term: 'Actual % (เส้นจริงสะสม)',
    color: 'text-blue-400',
    meaning: 'เส้น S-Curve สีน้ำเงิน แสดงผลงานสะสมที่ทำได้จริง คำนวณจาก Weight × (Progress/100) กระจายตลอดช่วง Actual Start → Actual Finish (หรือถึงวันนี้หากงานยังไม่เสร็จ)',
    prepare: 'อัปเดต % Progress ทุกสัปดาห์ และใส่ Actual Start ทันทีที่เริ่มงาน เพื่อให้เส้นจริงวิ่งอย่างต่อเนื่อง',
  },
  {
    term: 'Variance (ส่วนต่าง)',
    color: 'text-green-400',
    meaning: 'ความแตกต่างระหว่างเส้นจริงและเส้นแผน ณ วันเดียวกัน: บวก (+) = เร็วกว่าแผน (Ahead), ลบ (−) = ช้ากว่าแผน (Behind) Tooltip บน S-Curve แสดงค่านี้โดยตรง',
    prepare: 'ติดตาม Variance ทุกสัปดาห์ หาก Behind เกิน 5% ควรวิเคราะห์หาสาเหตุและปรับแผนเร่งงาน',
  },
  {
    term: 'Today Line (เส้นวันนี้)',
    color: 'text-yellow-400',
    meaning: 'เส้นแนวตั้งสีเหลืองบน S-Curve แสดงตำแหน่งปัจจุบัน ใช้เปรียบเทียบว่า ณ วันนี้ ควรทำได้กี่ % (Plan) และทำได้จริงกี่ % (Actual)',
    prepare: 'ไม่ต้องตั้งค่าใดๆ ระบบดึงวันที่จากระบบของเครื่องโดยอัตโนมัติ',
  },
];

const DATA_PREP_STEPS = [
  { step: '1', text: 'แบ่งโครงการออกเป็น Main Activity ตามหมวดงาน (เช่น งานโครงสร้าง / งานสถาปัตยกรรม / งานระบบ)' },
  { step: '2', text: 'แตก Main Activity แต่ละหมวดเป็น Sub-activity ย่อย ที่มีขอบเขตงานชัดเจนและวัดปริมาณได้' },
  { step: '3', text: 'กำหนด % Weight ของแต่ละ Sub-activity โดยผลรวมทั้งโครงการต้องเท่ากับ 100%' },
  { step: '4', text: 'กรอก Plan Start / Plan Finish ของทุก Sub-activity ตามตาราง Bar Chart ที่ได้รับอนุมัติ' },
  { step: '5', text: 'เมื่อเริ่มงานจริง: ใส่ Actual Start และอัปเดต % Progress ทุกรอบการรายงาน (รายสัปดาห์ หรือรายปักษ์)' },
  { step: '6', text: 'เมื่องานเสร็จ: ใส่ Actual Finish และตั้ง % Progress = 100 เพื่อปิดงานนั้น' },
];

export default function ManualModal() {
  const { isManualOpen, setIsManualOpen } = useApp();

  if (!isManualOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(10,21,32,0.85)' }}
      onClick={(e) => { if (e.target === e.currentTarget) setIsManualOpen(false); }}
    >
      <div className="card w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-industrial-700">
          <div className="w-9 h-9 bg-accent-500 rounded-lg flex items-center justify-center shrink-0">
            <BookOpen size={18} className="text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">คู่มือการวางแผนและติดตามโครงการ</h2>
            <p className="text-xs text-industrial-400">Project Planning Manual — CMG Planner v1.0</p>
          </div>
          <button
            onClick={() => setIsManualOpen(false)}
            className="ml-auto btn-ghost p-1.5"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6" style={{ maxWidth: '100%' }}>

          {/* ── Weight Management Critical Box ── */}
          <section>
            <h3 className="text-sm font-semibold text-red-400 mb-3 flex items-center gap-1.5">
              <AlertTriangle size={14} />
              กฎสำคัญ: การจัดการ % Weight — ต้องรวมได้ 100% เสมอ
            </h3>
            <div className="space-y-2.5 ml-1">
              {WEIGHT_RULES.map((r, i) => (
                <div key={i} className="bg-industrial-700/40 border border-industrial-600 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <span className="text-base leading-none shrink-0 mt-0.5">{r.icon}</span>
                    <div>
                      <p className="text-xs font-semibold text-white leading-snug">{r.rule}</p>
                      <p className="text-[10px] text-industrial-400 mt-1 leading-relaxed">{r.detail}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Visual example */}
            <div className="mt-3 bg-industrial-700/30 border border-industrial-600/60 rounded-lg p-3">
              <p className="text-[10px] font-semibold text-industrial-400 uppercase tracking-wider mb-2">ตัวอย่างที่ถูกต้อง</p>
              <div className="space-y-1">
                {[
                  { wbs: '1',   name: 'งานโครงสร้าง',      w: 40,  isMain: true  },
                  { wbs: '1.1', name: 'งานฐานราก',          w: 15,  isMain: false },
                  { wbs: '1.2', name: 'งานคาน/เสา',         w: 25,  isMain: false },
                  { wbs: '2',   name: 'งานระบบไฟฟ้า',       w: 35,  isMain: true  },
                  { wbs: '2.1', name: 'เดินสาย',            w: 20,  isMain: false },
                  { wbs: '2.2', name: 'ติดตั้งอุปกรณ์',     w: 15,  isMain: false },
                  { wbs: '3',   name: 'งานส่งมอบ',          w: 25,  isMain: true  },
                ].map((row) => (
                  <div key={row.wbs} className={`flex items-center gap-2 text-[10px] font-mono rounded px-2 py-0.5 ${
                    row.isMain ? 'bg-industrial-600/40 text-industrial-300' : 'text-industrial-400'
                  }`}>
                    <span className="w-8 shrink-0">{row.wbs}</span>
                    <span className="flex-1">{row.isMain ? '' : '↳ '}{row.name}</span>
                    <span className={row.isMain ? 'text-industrial-500' : 'text-accent-400 font-bold'}>{row.w}%</span>
                  </div>
                ))}
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-industrial-600/50 text-[10px]">
                  <span className="text-industrial-400">รวม Sub-activities (1.1+1.2+2.1+2.2+3)</span>
                  <span className="font-bold text-green-400 font-mono">15+25+20+15+25 = 100% ✓</span>
                </div>
              </div>
            </div>
          </section>

          {/* Sections */}
          {MANUAL_SECTIONS.map((section) => (
            <section key={section.id}>
              <h3 className="text-sm font-semibold text-accent-400 mb-2 flex items-center gap-1.5">
                <ChevronRight size={14} />
                {section.title}
              </h3>
              <ul className="space-y-1.5 ml-5">
                {section.content.map((item, i) => {
                  const [bold, ...rest] = item.split(':');
                  const hasBold = item.includes(':') && rest.length > 0 && bold.length < 40;
                  return (
                    <li key={i} className="text-sm text-industrial-200 flex gap-2">
                      <span className="text-industrial-500 mt-1 shrink-0">•</span>
                      <span>
                        {hasBold ? (
                          <>
                            <span className="text-white font-medium">{bold}:</span>
                            {rest.join(':')}
                          </>
                        ) : item}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}

          {/* ── S-Curve Deep Dive ── */}
          <section>
            <h3 className="text-sm font-semibold text-blue-400 mb-3 flex items-center gap-1.5">
              <TrendingUp size={14} />
              4. องค์ประกอบของ S-Curve — ความหมายและวิธีเตรียมข้อมูล
            </h3>
            <div className="space-y-3 ml-1">
              {SCURVE_ELEMENTS.map((el, i) => (
                <div key={i} className="bg-industrial-700/40 border border-industrial-600 rounded-lg p-3.5">
                  <div className={`text-xs font-bold mb-1 ${el.color}`}>{el.term}</div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1">
                      <span className="text-[10px] font-semibold text-industrial-400 uppercase tracking-wider">ความหมาย</span>
                      <p className="text-xs text-industrial-200 mt-0.5 leading-relaxed">{el.meaning}</p>
                    </div>
                    <div className="sm:w-56 shrink-0">
                      <span className="text-[10px] font-semibold text-accent-500 uppercase tracking-wider flex items-center gap-1">
                        <Info size={9} /> วิธีเตรียมข้อมูล
                      </span>
                      <p className="text-xs text-industrial-300 mt-0.5 leading-relaxed">{el.prepare}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── Data Prep Steps ── */}
          <section>
            <h3 className="text-sm font-semibold text-accent-400 mb-3 flex items-center gap-1.5">
              <ChevronRight size={14} />
              5. ขั้นตอนการเตรียมข้อมูลเพื่อให้ S-Curve มีความแม่นยำ
            </h3>
            <ol className="space-y-2 ml-1">
              {DATA_PREP_STEPS.map((s) => (
                <li key={s.step} className="flex items-start gap-3">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-accent-500/20 border border-accent-500/50
                                   text-accent-400 text-[10px] font-bold flex items-center justify-center mt-0.5">
                    {s.step}
                  </span>
                  <span className="text-xs text-industrial-200 leading-relaxed">{s.text}</span>
                </li>
              ))}
            </ol>
          </section>

          {/* ── Reading the S-Curve ── */}
          <section>
            <h3 className="text-sm font-semibold text-accent-400 mb-3 flex items-center gap-1.5">
              <ChevronRight size={14} />
              6. วิธีอ่านและใช้ประโยชน์จาก S-Curve
            </h3>
            <div className="bg-industrial-700/30 border border-industrial-600 rounded-lg p-4 space-y-3">
              <SCurveReadingRow
                label="เส้นจริง อยู่เหนือเส้นแผน"
                badge="Ahead of Schedule"
                badgeCls="bg-green-900/60 text-green-300 border-green-700"
                desc="โครงการเร็วกว่าแผน ตรวจสอบว่าคุณภาพงานได้มาตรฐานหรือไม่ และอาจใช้โอกาสนี้สร้าง buffer time"
              />
              <SCurveReadingRow
                label="เส้นจริง อยู่ต่ำกว่าเส้นแผน"
                badge="Behind Schedule"
                badgeCls="bg-red-900/60 text-red-300 border-red-700"
                desc="โครงการช้ากว่าแผน วิเคราะห์ว่างานใดใน Lookahead ที่ยังไม่เริ่ม หรือ Progress ต่ำ แล้วเร่งทรัพยากร"
              />
              <SCurveReadingRow
                label="เส้นแผน ชันมากในบางช่วง"
                badge="Peak Period"
                badgeCls="bg-yellow-900/50 text-yellow-300 border-yellow-700/60"
                desc="ช่วงที่มีงานหนาแน่น (งานหลายรายการทับซ้อนกัน) ควรเตรียมทรัพยากรล่วงหน้าและระวังคอขวด"
              />
              <SCurveReadingRow
                label="เส้นจริง หยุดนิ่ง ไม่วิ่ง"
                badge="No Progress"
                badgeCls="bg-industrial-600 text-industrial-300 border-industrial-500"
                desc="ไม่มีการอัปเดต % Progress หรือยังไม่ได้ใส่ Actual Start ตรวจสอบข้อมูลใน Activity Edit Modal"
              />
            </div>
          </section>

          {/* Tips */}
          <section>
            <h3 className="text-sm font-semibold text-accent-400 mb-3 flex items-center gap-1.5">
              <ChevronRight size={14} />
              เคล็ดลับการใช้งาน
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 ml-1">
              {TIPS.map((tip, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2.5 bg-industrial-700/50 border border-industrial-600 rounded-lg p-3"
                >
                  <span className="text-lg leading-none">{tip.icon}</span>
                  <span className="text-xs text-industrial-200 leading-relaxed">{tip.text}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Color legend */}
          <section>
            <h3 className="text-sm font-semibold text-accent-400 mb-3 flex items-center gap-1.5">
              <ChevronRight size={14} />
              สัญลักษณ์สี Gantt Chart
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 ml-1">
              <ColorSwatch color="bg-industrial-500" label="Plan Bar (แผน)" />
              <ColorSwatch color="bg-blue-500" label="Actual Bar (จริง)" />
              <ColorSwatch color="bg-blue-700" label="Progress Fill" />
              <ColorSwatch color="bg-red-500" label="ล่าช้า (Late)" />
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-industrial-700 flex justify-end">
          <button onClick={() => setIsManualOpen(false)} className="btn-primary">
            เข้าใจแล้ว — เริ่มใช้งาน
          </button>
        </div>
      </div>
    </div>
  );
}

function ColorSwatch({ color, label }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-4 h-3 rounded ${color} shrink-0`} />
      <span className="text-xs text-industrial-300">{label}</span>
    </div>
  );
}

function SCurveReadingRow({ label, badge, badgeCls, desc }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-2">
      <div className="flex items-center gap-2 sm:w-56 shrink-0">
        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${badgeCls} whitespace-nowrap`}>
          {badge}
        </span>
        <span className="text-xs text-industrial-300 font-medium">{label}</span>
      </div>
      <p className="text-xs text-industrial-400 leading-relaxed flex-1">{desc}</p>
    </div>
  );
}
