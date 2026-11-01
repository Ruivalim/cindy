import { useMemo, useRef, useState } from "react";
import { Alert, FlatList, ScrollView, TextInput, View } from "react-native";
import {
  Copy,
  Search,
  WrapText,
  ListOrdered,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Text } from "@/components/AppText";
import { monoFont, spacing, textStyles, useTheme } from "@/theme";
import { writeClipboardText } from "@/session/messageActions";
import { PreviewIconButton } from "./PreviewChrome";

/** Bounded, virtualized source reader. Finding and wrapping never modify the original. */
export function TextDocumentPreview({
  text,
  initialLine,
}: {
  text: string;
  initialLine?: number | null;
}) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [find, setFind] = useState(false);
  const [query, setQuery] = useState("");
  const [match, setMatch] = useState(0);
  const [wrap, setWrap] = useState(true);
  const [numbers, setNumbers] = useState(true);
  const list = useRef<FlatList<string>>(null);
  const initialPosition = useRef<{ text: string; line?: number | null } | null>(
    null,
  );
  const lines = useMemo(() => text.split(/\r?\n/), [text]);
  const hits = useMemo(
    () =>
      query
        ? lines.flatMap((line, index) =>
            line.toLocaleLowerCase().includes(query.toLocaleLowerCase())
              ? [index]
              : [],
          )
        : [],
    [lines, query],
  );
  const jump = (index: number) => {
    const next = (index + hits.length) % hits.length;
    if (!hits.length) return;
    setMatch(next);
    list.current?.scrollToIndex({
      index: hits[next],
      viewPosition: 0.3,
      animated: false,
    });
  };
  const reader = (
    <FlatList
      ref={list}
      data={lines}
      keyExtractor={(_, index) => String(index)}
      initialNumToRender={40}
      onLayout={() => {
        if (
          initialPosition.current?.text === text &&
          initialPosition.current.line === initialLine
        )
          return;
        initialPosition.current = { text, line: initialLine };
        if (initialLine && initialLine > 0 && initialLine <= lines.length)
          list.current?.scrollToIndex({
            index: initialLine - 1,
            animated: false,
          });
      }}
      onScrollToIndexFailed={({ averageItemLength, index }) =>
        list.current?.scrollToOffset({
          offset: averageItemLength * index,
          animated: false,
        })
      }
      contentContainerStyle={{ padding: spacing.md }}
      style={{ flex: 1 }}
      renderItem={({ item, index }) => (
        <View
          style={{
            flexDirection: "row",
            backgroundColor:
              hits[match] === index ? colors.surfaceChip : undefined,
          }}
        >
          {numbers ? (
            <Text
              style={[
                textStyles.caption,
                {
                  color: colors.textTertiary,
                  minWidth: 40,
                  paddingRight: spacing.sm,
                  textAlign: "right",
                },
              ]}
            >
              {index + 1}
            </Text>
          ) : null}
          <Text
            selectable
            style={{
              color: colors.textPrimary,
              fontFamily: monoFont,
              fontSize: 13,
              lineHeight: 20,
              ...(wrap ? { flex: 1 } : {}),
            }}
          >
            {item || " "}
          </Text>
        </View>
      )}
    />
  );
  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          borderBottomWidth: 0.5,
          borderColor: colors.border,
        }}
      >
        <PreviewIconButton
          icon={Search}
          label={t("message.attachmentPreview.find")}
          onPress={() => setFind((value) => !value)}
        />
        <PreviewIconButton
          icon={WrapText}
          label={t("message.attachmentPreview.wrap")}
          onPress={() => setWrap((value) => !value)}
        />
        <PreviewIconButton
          icon={ListOrdered}
          label={t("message.attachmentPreview.lineNumbers")}
          onPress={() => setNumbers((value) => !value)}
        />
        <PreviewIconButton
          icon={Copy}
          label={t("message.renderer.copyDetailContent")}
          onPress={() => {
            void writeClipboardText(text).catch(() =>
              Alert.alert(t("files.preview.readFailed")),
            );
          }}
        />
      </View>
      {find ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingLeft: spacing.md,
          }}
        >
          <TextInput
            autoFocus
            value={query}
            onChangeText={(value) => {
              setQuery(value);
              setMatch(0);
            }}
            placeholder={t("message.attachmentPreview.find")}
            placeholderTextColor={colors.textTertiary}
            style={{
              flex: 1,
              minWidth: 0,
              color: colors.textPrimary,
              minHeight: 48,
            }}
            onSubmitEditing={() => jump(match + 1)}
          />
          <Text style={[textStyles.caption, { color: colors.textSecondary }]}>
            {hits.length ? match + 1 : 0}/{hits.length}
          </Text>
          <PreviewIconButton
            icon={ChevronLeft}
            label={t("message.attachmentPreview.previous")}
            disabled={!hits.length}
            onPress={() => jump(match - 1)}
          />
          <PreviewIconButton
            icon={ChevronRight}
            label={t("message.attachmentPreview.next")}
            disabled={!hits.length}
            onPress={() => jump(match + 1)}
          />
          <PreviewIconButton
            icon={X}
            label={t("message.attachmentPreview.close")}
            onPress={() => {
              setFind(false);
              setQuery("");
            }}
          />
        </View>
      ) : null}
      {wrap ? (
        reader
      ) : (
        <ScrollView horizontal contentContainerStyle={{ flexGrow: 1 }}>
          {reader}
        </ScrollView>
      )}
    </View>
  );
}
