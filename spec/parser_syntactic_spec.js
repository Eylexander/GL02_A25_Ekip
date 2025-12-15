const giftParserModule = require('../giftParser');

describe("Program Syntactic testing of giftParser", function () {

	beforeAll(function () {
		const testFilePath = './data/U1-p7-Adverbs.gift';

		this.questions = giftParserModule.parseGiftFile(testFilePath);
	});

	it("should parse a simple GIFT file", function () {		
		expect(this.questions).toBeDefined();
		expect(this.questions.length).toBeGreaterThan(0);
		expect(this.questions[0].title).toBe("U1 p7 Adverbs GR 1.1");
	});

	it("can read multiple questions from input", function () {
		expect(Array.isArray(this.questions)).toBe(true);
		expect(this.questions.length).toEqual(5);
	});

	it("should identify question type as ShortAnswer", function () {
		expect(this.questions[0].type).toBe("ShortAnswer");
		expect(this.questions[1].type).toBe("ShortAnswer");
	});

	it("should extract question title correctly", function () {
		expect(this.questions[0].title).toBe("U1 p7 Adverbs GR 1.1");
		expect(this.questions[1].title).toBe("U1 p7 Adverbs GR 1.2");
		expect(this.questions[4].title).toBe("U1 p7 Adverbs GR 1.5");
	});

	it("should parse answers for a question", function () {
		expect(this.questions[0].answers).toBeDefined();
		expect(Array.isArray(this.questions[0].answers)).toBe(true);
		expect(this.questions[0].answers.length).toBeGreaterThan(0);
		expect(this.questions[0].answers[0]).toEqual(jasmine.objectContaining({
			text: jasmine.any(String),
			correct: true
		}));
	});

	it("should handle multiple correct answers", function () {
		expect(this.questions[1].answers.length).toBeGreaterThan(1);
		this.questions[1].answers.forEach(answer => {
			expect(answer.correct).toBe(true);
		});
	});

	it("should extract HTML content from question text", function () {
		const questionText = this.questions[0].questionText;
		expect(questionText).toBeDefined();
		expect(questionText).toContain("Does she come by car");
	});

});